from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from typing import List, Dict, Any
import os
import asyncio
import datetime
import uuid
import shutil
from fastapi import UploadFile, File, Form, Body

from models import UserCreate, User, Company, Product, ProductCreate, RFQCreate, RFQ, NegotiationRoom, Message, Quote, Order, OfferCard, OfferVersion
from auth import verify_token
from ws_manager import manager
from routers.kyb import router as kyb_router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.include_router(kyb_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static/contracts", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "YOUR_SUPABASE_KEY_HERE")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None

class LocalMemoryDB:
    def table(self, name):
        class LocalTable:
            def select(self, *args, **kwargs):
                return self
            def eq(self, *args, **kwargs):
                return self
            def execute(self):
                class Res:
                    data = []
                return Res()
            def insert(self, data):
                return self
            def update(self, data):
                return self
        return LocalTable()

LOCAL_MEMORY_DB = LocalMemoryDB()

def get_db():
    if not supabase:
        return LOCAL_MEMORY_DB
    return supabase

@app.get("/")
def read_root():
    return {"message": "TradoxB2B API is running on Supabase"}

@app.get("/api/stats")
def get_platform_stats():
    db = get_db()
    try:
        u_res = db.table("users").select("id").execute()
        user_count = len(u_res.data) if u_res.data else 1

        c_res = db.table("companies").select("id").execute()
        comp_count = len(c_res.data) if c_res.data else 1

        p_res = db.table("products").select("id").execute()
        prod_count = len(p_res.data) if p_res.data else 0

        r_res = db.table("rfqs").select("id").execute()
        rfq_count = len(r_res.data) if r_res.data else 0

        return {
            "users_count": user_count,
            "companies_count": comp_count,
            "products_count": prod_count,
            "rfqs_count": rfq_count,
            "total_lots": prod_count + rfq_count
        }
    except Exception as e:
        return {
            "users_count": 1,
            "companies_count": 1,
            "products_count": 0,
            "rfqs_count": 0,
            "total_lots": 0
        }

@app.get("/api/commodities/top")
def get_top_commodities():
    db = get_db()
    items = []
    try:
        p_res = db.table("products").select("*").limit(20).execute()
        for p in (p_res.data or []):
            unit = p.get("unit") or "MT"
            items.append({
                "id": p.get("id"),
                "title": p.get("title") or p.get("name") or "Bulk Commodity",
                "category": p.get("category", "General"),
                "price": f"${float(p.get('price', 0)):,.2f} / {unit}",
                "volume": f"{float(p.get('quantity', 0)):,.0f} {unit} Listed",
                "type": "SELL Offer"
            })
            
        r_res = db.table("rfqs").select("*").limit(20).execute()
        for r in (r_res.data or []):
            unit = r.get("unit") or "MT"
            tp = r.get("targetPrice")
            price_str = f"${float(tp):,.2f} / {unit}" if tp else "Market Best Offer"
            items.append({
                "id": r.get("id"),
                "title": r.get("title") or r.get("product") or "Buyer Requirement",
                "category": r.get("category", "General"),
                "price": price_str,
                "volume": f"{float(r.get('targetQuantity', 0)):,.0f} {unit} Required",
                "type": "BUY Requirement"
            })
    except Exception as e:
        print("Error fetching top commodities:", e)

    if items:
        return items

    return [
        {"id": "c1", "title": "Basmati Rice 1121", "category": "Agriculture", "price": "$1,250.00 / MT", "volume": "Active Market Lot", "type": "Live Market"},
        {"id": "c2", "title": "Gold Bullion 999.9", "category": "Metals", "price": "$2,450.50 / OZ", "volume": "Active Market Lot", "type": "Live Market"},
        {"id": "c3", "title": "TMT Rebar Steel", "category": "Metals & Mining", "price": "$620.00 / MT", "volume": "Active Market Lot", "type": "Live Market"},
        {"id": "c4", "title": "OPC 53 Cement", "category": "Construction", "price": "$55.00 / MT", "volume": "Active Market Lot", "type": "Live Market"},
        {"id": "c5", "title": "Durum Wheat Grain", "category": "Agriculture", "price": "$680.20 / MT", "volume": "Active Market Lot", "type": "Live Market"},
        {"id": "c6", "title": "Raw Cotton Bales", "category": "Textiles", "price": "$1,840.00 / MT", "volume": "Active Market Lot", "type": "Live Market"},
        {"id": "c7", "title": "Refined White Sugar", "category": "Agriculture", "price": "$540.00 / MT", "volume": "Active Market Lot", "type": "Live Market"},
        {"id": "c8", "title": "Arabica Coffee Beans", "category": "Agriculture", "price": "$4,320.00 / MT", "volume": "Active Market Lot", "type": "Live Market"}
    ]

@app.post("/api/users", response_model=User)
async def create_user(user_data: UserCreate, token_data: dict = Depends(verify_token)):
    firebase_uid = user_data.firebase_uid
    db = get_db()
    
    company = Company(
        companyName=user_data.companyName,
        gst=user_data.gst,
        iec=user_data.iec,
        country=user_data.country,
        businessCategory=user_data.businessCategory,
        address=user_data.address
    )
    
    try:
        db.table("companies").insert({
            "id": company.id,
            "name": company.companyName,
            "type": company.businessCategory,
            "verificationStatus": company.kybStatus,
            "createdAt": company.createdAt
        }).execute()
    except Exception as e:
        print("Notice inserting company:", e)
        
    existing = db.table("users").select("*").eq("firebase_uid", firebase_uid).execute()
    if existing.data:
        existing_u = existing.data[0]
        try:
            db.table("users").update({
                "companyId": company.id,
                "name": user_data.name or existing_u.get("name"),
                "phone": user_data.phone or existing_u.get("phone")
            }).eq("firebase_uid", firebase_uid).execute()
        except Exception as e:
            print("Notice updating user:", e)
            
        return User(
            id=existing_u["id"],
            firebase_uid=firebase_uid,
            companyId=company.id,
            name=user_data.name or existing_u.get("name") or "User",
            email=user_data.email or existing_u.get("email"),
            role=existing_u.get("role", "TRADER"),
            kybStatus=existing_u.get("kybStatus", "PENDING")
        )
        
    user_role = "PLATFORM OWNER" if user_data.email and user_data.email.strip().lower() in ["krishnametri223344@gmail.com", "owner@tradoxb2b.com"] else "TRADER"
    
    user = User(
        firebase_uid=firebase_uid,
        companyId=company.id,
        name=user_data.name or "Trader",
        email=user_data.email,
        phone=user_data.phone,
        role=user_role
    )
    
    try:
        db.table("users").insert({
            "id": user.id,
            "firebase_uid": user.firebase_uid,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "companyId": user.companyId,
            "kybStatus": "PENDING",
            "createdAt": user.createdAt
        }).execute()
    except Exception as e:
        print("Notice inserting user:", e)
    
    return user

@app.get("/api/users/me", response_model=User)
async def get_me(token_data: dict = Depends(verify_token)):
    db = get_db()
    uid = token_data.get("uid")
    user_email = token_data.get("email", "").strip().lower()
    user_name = token_data.get("name") or (user_email.split("@")[0].capitalize() if user_email else "Trader")
    
    res = db.table("users").select("*").eq("firebase_uid", uid).execute()
    if not res.data and user_email:
        res = db.table("users").select("*").eq("email", user_email).execute()
        if res.data:
            try:
                db.table("users").update({"firebase_uid": uid}).eq("id", res.data[0]["id"]).execute()
            except Exception as e:
                print("Notice linking firebase_uid:", e)
                
    if not res.data:
        role = "PLATFORM OWNER" if user_email in ["krishnametri223344@gmail.com", "owner@tradoxb2b.com"] else "TRADER"
        u = {
            "id": uid,
            "firebase_uid": uid,
            "companyId": "comp_default",
            "name": user_name,
            "email": user_email or "trader@tradoxb2b.com",
            "phone": None,
            "role": role,
            "kybStatus": "PENDING",
            "companyName": None
        }
        try:
            db.table("users").insert(u).execute()
        except Exception as e:
            pass
    else:
        u = res.data[0]
    
    comp_name = u.get("companyName") or u.get("company_name")
    kyb_status = u.get("kybStatus", "PENDING")
    if u.get("companyId"):
        try:
            c_res = db.table("companies").select("*").eq("id", u["companyId"]).execute()
            if c_res.data:
                comp = c_res.data[0]
                comp_name = comp_name or comp.get("name") or comp.get("companyName")
                if comp.get("verificationStatus") == "VERIFIED":
                    kyb_status = "VERIFIED"
        except Exception as e:
            print("Notice reading company in get_me:", e)
            
    role = "PLATFORM OWNER" if user_email in ["krishnametri223344@gmail.com", "owner@tradoxb2b.com"] else (u.get("role") if u.get("role") != "ADMIN" else "TRADER")
    
    # Create response dictionary
    user_resp = dict(u)
    user_resp["role"] = role
    user_resp["kybStatus"] = kyb_status
    user_resp["companyName"] = comp_name
    user_resp["company_name"] = comp_name
    user_resp["name"] = u.get("name") or user_name
    user_resp["companyId"] = u.get("companyId") or "comp_default"
    
    return user_resp

@app.patch("/api/users/me", response_model=User)
async def update_me(data: dict = Body(...), token_data: dict = Depends(verify_token)):
    db = get_db()
    uid = token_data.get("uid")
    user_email = token_data.get("email", "").strip().lower()
    
    update_data = {}
    if "name" in data and data["name"]:
        update_data["name"] = data["name"].strip()
    if "phone" in data and data["phone"]:
        update_data["phone"] = data["phone"].strip()
        
    res = db.table("users").select("*").eq("firebase_uid", uid).execute()
    if not res.data and user_email:
        res = db.table("users").select("*").eq("email", user_email).execute()
        
    if res.data:
        u_id = res.data[0]["id"]
        if update_data:
            try:
                db.table("users").update(update_data).eq("id", u_id).execute()
            except Exception as e:
                print("Notice updating user me:", e)
                
    return await get_me(token_data)

@app.get("/api/companies/me", response_model=Company)
async def get_my_company(token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    c_res = db.table("companies").select("*").eq("id", res.data[0]["companyId"]).execute()
    if not c_res.data:
        raise HTTPException(status_code=404, detail="Company not found")
    
    c = c_res.data[0]
    return Company(id=c["id"], companyName=c["name"], businessCategory=c["type"], country="Unknown", address="Unknown", kybStatus=res.data[0]["kybStatus"])

@app.post("/api/products", response_model=Product)
async def create_product(product_data: ProductCreate, token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    expiresAt = (datetime.datetime.utcnow() + datetime.timedelta(hours=product_data.durationHours)).isoformat() + "Z" if product_data.durationHours else None
    
    product = Product(**product_data.model_dump(), companyId=res.data[0]["companyId"], createdBy=token_data.get("uid"), expiresAt=expiresAt)
    
    insert_data = {
        "id": product.id,
        "companyId": product.companyId,
        "title": product.name,
        "description": product.description,
        "category": product.category,
        "price": product.price,
        "quantity": product.quantity,
        "country": product.country,
        "moq": product.moq,
        "createdAt": product.createdAt
    }
    if expiresAt:
        insert_data["expiresAt"] = expiresAt
        
    db.table("products").insert(insert_data).execute()
    return product

@app.get("/api/products", response_model=List[Product])
async def get_products():
    db = get_db()
    now_iso = datetime.datetime.utcnow().isoformat()
    try:
        db.table("products").delete().lt("expiresAt", now_iso).execute()
    except:
        pass
    res = db.table("products").select("*").execute()
    out = []
    for p in res.data:
        out.append(Product(id=p["id"], companyId=p["companyId"], createdBy="", category=p.get("category",""), name=p.get("title",""), description=p.get("description"), price=p.get("price",0), quantity=0, country="", moq=p.get("moq",0), expiresAt=p.get("expiresAt")))
    return out

@app.get("/api/products/me", response_model=List[Product])
async def get_my_products(token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    c_id = res.data[0]["companyId"]
    
    now_iso = datetime.datetime.utcnow().isoformat()
    try:
        db.table("products").delete().lt("expiresAt", now_iso).execute()
    except:
        pass
        
    p_res = db.table("products").select("*").eq("companyId", c_id).execute()
    out = []
    for p in p_res.data:
        out.append(Product(
            id=p["id"],
            companyId=p["companyId"],
            createdBy=token_data.get("uid"),
            category=p.get("category","Agriculture"),
            name=p.get("title",""),
            description=p.get("description"),
            price=float(p.get("price", 0)),
            quantity=float(p.get("quantity", 100)),
            country=p.get("country", "India"),
            moq=float(p.get("moq", 10)),
            expiresAt=p.get("expiresAt")
        ))
    return out

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    c_id = res.data[0]["companyId"]
    db.table("products").delete().eq("id", product_id).eq("companyId", c_id).execute()
    return {"status": "deleted"}

@app.post("/api/rfqs", response_model=RFQ)
async def create_rfq(rfq_data: RFQCreate, token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    
    expiresAt = (datetime.datetime.utcnow() + datetime.timedelta(hours=rfq_data.durationHours)).isoformat() + "Z" if rfq_data.durationHours else None
    
    rfq = RFQ(**rfq_data.model_dump(), companyId=res.data[0]["companyId"], createdBy=token_data.get("uid"), expiresAt=expiresAt)
    
    insert_data = {
        "id": rfq.id,
        "buyerCompanyId": rfq.companyId,
        "title": rfq.product,
        "description": rfq.description,
        "category": rfq.category,
        "targetPrice": rfq.targetPrice,
        "targetQuantity": rfq.quantity,
        "status": rfq.status,
        "createdAt": rfq.createdAt
    }
    if expiresAt:
        insert_data["expiresAt"] = expiresAt
        
    db.table("rfqs").insert(insert_data).execute()
    return rfq

@app.get("/api/rfqs/me", response_model=List[RFQ])
async def get_my_rfqs(token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    c_id = res.data[0]["companyId"]
    
    now_iso = datetime.datetime.utcnow().isoformat()
    try:
        db.table("rfqs").delete().lt("expiresAt", now_iso).execute()
    except:
        pass
        
    r_res = db.table("rfqs").select("*").eq("buyerCompanyId", c_id).execute()
    out = []
    for r in r_res.data:
        out.append(RFQ(
            id=r["id"],
            companyId=r["buyerCompanyId"],
            createdBy=token_data.get("uid"),
            product=r.get("title",""),
            category=r.get("category","Agriculture"),
            quantity=float(r.get("targetQuantity", 0)),
            targetPrice=float(r.get("targetPrice")) if r.get("targetPrice") else None,
            destinationCountry=r.get("destinationCountry", "Global"),
            deliveryDate=r.get("deliveryDate", "Immediate"),
            description=r.get("description"),
            expiresAt=r.get("expiresAt")
        ))
    return out

@app.delete("/api/rfqs/{rfq_id}")
async def delete_rfq(rfq_id: str, token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    c_id = res.data[0]["companyId"]
    db.table("rfqs").delete().eq("id", rfq_id).eq("buyerCompanyId", c_id).execute()
    return {"status": "deleted"}

@app.get("/api/rfqs", response_model=List[RFQ])
async def get_rfqs():
    db = get_db()
    now_iso = datetime.datetime.utcnow().isoformat()
    try:
        db.table("rfqs").delete().lt("expiresAt", now_iso).execute()
    except:
        pass
    res = db.table("rfqs").select("*").execute()
    out = []
    for r in res.data:
        out.append(RFQ(id=r["id"], companyId=r["buyerCompanyId"], createdBy="", product=r.get("title",""), category=r.get("category",""), quantity=r.get("targetQuantity",0), targetPrice=r.get("targetPrice"), destinationCountry="", deliveryDate="", description=r.get("description"), expiresAt=r.get("expiresAt")))
    return out

@app.post("/api/negotiations/rooms", response_model=NegotiationRoom)
async def create_negotiation_room(data: dict, token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    buyer_company_id = res.data[0]["companyId"]
    
    rfq_id = data.get("rfqId")
    product_id = data.get("productId")
    supplier_company_id = None
    
    if rfq_id:
        rfq_res = db.table("rfqs").select("*").eq("id", rfq_id).execute()
        supplier_company_id = buyer_company_id
        buyer_company_id = rfq_res.data[0]["buyerCompanyId"]
    elif product_id:
        p_res = db.table("products").select("*").eq("id", product_id).execute()
        supplier_company_id = p_res.data[0]["companyId"]
        
    ex = db.table("negotiation_rooms").select("*").eq("buyerCompanyId", buyer_company_id).eq("supplierCompanyId", supplier_company_id).execute()
    if ex.data:
        for r in ex.data:
            if (rfq_id and r.get("rfqId") == rfq_id) or (product_id and r.get("productId") == product_id):
                e = r
                return NegotiationRoom(id=e["id"], buyerCompanyId=e["buyerCompanyId"], supplierCompanyId=e["supplierCompanyId"], rfqId=e.get("rfqId"), productId=e.get("productId"))
        
    new_room = NegotiationRoom(buyerCompanyId=buyer_company_id, supplierCompanyId=supplier_company_id, rfqId=rfq_id, productId=product_id)
    db.table("negotiation_rooms").insert({
        "id": new_room.id,
        "buyerCompanyId": new_room.buyerCompanyId,
        "supplierCompanyId": new_room.supplierCompanyId,
        "rfqId": new_room.rfqId,
        "productId": new_room.productId,
        "status": new_room.status,
        "createdAt": new_room.createdAt
    }).execute()
    
    sys_msg = Message(room_id=new_room.id, sender_id="system", content="Negotiation room created.")
    db.table("messages").insert({"id": sys_msg.id, "room_id": sys_msg.room_id, "sender_id": sys_msg.sender_id, "content": sys_msg.content, "timestamp": sys_msg.timestamp}).execute()
    
    return new_room

@app.get("/api/negotiations/rooms")
async def get_rooms(token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    c_id = res.data[0]["companyId"]
    
    r_res = db.table("negotiation_rooms").select("*").or_(f"buyerCompanyId.eq.{c_id},supplierCompanyId.eq.{c_id}").execute()
    
    out = []
    for e in r_res.data:
        out.append(NegotiationRoom(id=e["id"], buyerCompanyId=e["buyerCompanyId"], supplierCompanyId=e["supplierCompanyId"], rfqId=e.get("rfqId"), productId=e.get("productId")))
    return out

@app.get("/api/negotiations/rooms/{room_id}")
async def get_room(room_id: str, token_data: dict = Depends(verify_token)):
    db = get_db()
    ex = db.table("negotiation_rooms").select("*").eq("id", room_id).execute()
    e = ex.data[0]
    return NegotiationRoom(id=e["id"], buyerCompanyId=e["buyerCompanyId"], supplierCompanyId=e["supplierCompanyId"], rfqId=e.get("rfqId"), productId=e.get("productId"))

@app.get("/api/negotiations/rooms/{room_id}/messages")
async def get_messages(room_id: str, token_data: dict = Depends(verify_token)):
    db = get_db()
    m = db.table("messages").select("*").eq("room_id", room_id).order("timestamp").execute()
    out = []
    for x in m.data:
        out.append(Message(id=x["id"], room_id=x["room_id"], sender_id=x["sender_id"], content=x.get("content"), offer_version=x.get("offer_version"), timestamp=x.get("timestamp")))
    return out

@app.post("/api/negotiations/rooms/{room_id}/messages", response_model=Message)
async def send_room_message(room_id: str, data: dict, token_data: dict = Depends(verify_token)):
    db = get_db()
    uid = token_data.get("uid")
    content = data.get("content", "")
    
    msg = Message(room_id=room_id, sender_id=uid, content=content)
    db.table("messages").insert({
        "id": msg.id,
        "room_id": msg.room_id,
        "sender_id": msg.sender_id,
        "content": msg.content,
        "timestamp": msg.timestamp
    }).execute()
    
    try:
        await manager.broadcast_to_room(room_id, {"type": "chat", "message": msg.model_dump()})
    except Exception as e:
        print("WebSocket broadcast error:", e)
        
    return msg

@app.post("/api/negotiations/rooms/{room_id}/offers")
async def submit_offer(room_id: str, data: dict, token_data: dict = Depends(verify_token)):
    db = get_db()
    uid = token_data.get("uid")
    
    m = db.table("messages").select("*").eq("room_id", room_id).not_.is_("offer_version", "null").execute()
    next_ver = 1
    if m.data:
        next_ver = len(m.data) + 1
        
    try:
        price = float(data.get("price") or 0)
    except Exception:
        price = 0.0

    try:
        quantity = float(data.get("quantity") or 0)
    except Exception:
        quantity = 0.0

    try:
        moq = float(data.get("moq") or 1)
    except Exception:
        moq = 1.0

    try:
        validity_hours = int(data.get("validity_hours") or 24)
    except Exception:
        validity_hours = 24

    card = OfferCard(
        price=price,
        quantity=quantity,
        moq=moq,
        delivery_date=str(data.get("delivery_date") or data.get("deliveryDate") or "TBD"),
        packaging=str(data.get("packaging") or "Standard"),
        payment_terms=str(data.get("payment_terms") or data.get("paymentTerms") or "LC at sight"),
        incoterms=str(data.get("incoterms") or data.get("incoterm") or "FOB"),
        inspection=str(data.get("inspection") or "SGS / Independent"),
        destination=str(data.get("destination") or data.get("destination_port") or "Any"),
        validity_hours=validity_hours,
        remarks=str(data.get("remarks") or data.get("specifications") or "")
    )
    ov = OfferVersion(version=next_ver, created_by=uid, timestamp=datetime.datetime.utcnow().isoformat() + "Z", card=card)
    
    msg = Message(room_id=room_id, sender_id=uid, content=f"Sent Offer v{next_ver}", offer_version=ov)
    db.table("messages").insert({"id": msg.id, "room_id": msg.room_id, "sender_id": msg.sender_id, "content": msg.content, "offer_version": msg.offer_version.model_dump() if msg.offer_version else None, "timestamp": msg.timestamp}).execute()
    
    try:
        await manager.broadcast_to_room(room_id, {"type": "chat", "message": msg.model_dump()})
    except Exception as e:
        print("WebSocket broadcast error:", e)

    return msg

@app.websocket("/ws/negotiations/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id=room_id)
    db = get_db()
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "chat":
                msg = Message(room_id=room_id, sender_id=data.get("sender_id"), content=data.get("content"))
                db.table("messages").insert({"id": msg.id, "room_id": msg.room_id, "sender_id": msg.sender_id, "content": msg.content, "timestamp": msg.timestamp}).execute()
                await manager.broadcast_to_room(room_id, {"type": "chat", "message": msg.model_dump()})
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id=room_id)

# ─── PERSISTENT KYB SUBMISSIONS STORE (JSON file-backed, survives restarts) ──
import json

KYB_STORE_PATH = os.path.join(os.path.dirname(__file__), "kyb_submissions_store.json")

def load_kyb_store():
    """Load all KYB submissions from persistent JSON file."""
    try:
        if os.path.exists(KYB_STORE_PATH):
            with open(KYB_STORE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
    except Exception as e:
        print("Notice loading KYB store:", e)
    return []

def save_kyb_store(submissions: list):
    """Save all KYB submissions to persistent JSON file."""
    try:
        with open(KYB_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(submissions, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Notice saving KYB store:", e)

