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


def _room_from_row(e: dict) -> NegotiationRoom:
    """Safely convert a DB row dict to a NegotiationRoom, handling missing keys."""
    return NegotiationRoom(
        id=e["id"],
        buyerCompanyId=e.get("buyerCompanyId", ""),
        supplierCompanyId=e.get("supplierCompanyId", ""),
        rfqId=e.get("rfqId"),
        productId=e.get("productId"),
        status=e.get("status", "ACTIVE"),
        listing_type=e.get("listing_type", "PRODUCT"),
        listing_title=e.get("listing_title"),
        commodity_name=e.get("commodity_name"),
        quantity=e.get("quantity"),
        unit=e.get("unit", "MT"),
        price=e.get("price"),
        buyer_company_name=e.get("buyer_company_name"),
        seller_company_name=e.get("seller_company_name"),
        origin_country=e.get("origin_country"),
        last_message_at=e.get("last_message_at"),
        unread_buyer=e.get("unread_buyer", 0),
        unread_seller=e.get("unread_seller", 0),
        buyer_user_id=e.get("buyer_user_id"),
        seller_user_id=e.get("seller_user_id"),
        createdAt=e.get("createdAt", datetime.datetime.utcnow().isoformat() + "Z"),
        updatedAt=e.get("updatedAt", datetime.datetime.utcnow().isoformat() + "Z"),
    )


@app.post("/api/negotiations/rooms", response_model=NegotiationRoom)
async def create_negotiation_room(data: dict, token_data: dict = Depends(verify_token)):
    db = get_db()
    uid = token_data.get("uid")
    user_res = db.table("users").select("*").eq("firebase_uid", uid).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
    current_user = user_res.data[0]
    my_company_id = current_user.get("companyId")

    rfq_id = data.get("rfqId")
    product_id = data.get("productId")

    buyer_company_id = None
    supplier_company_id = None
    buyer_uid = None
    seller_uid = None
    commodity_name = None
    listing_title = None
    listing_type = "PRODUCT"
    quantity = None
    unit = "MT"
    price = None
    origin_country = None
    buyer_company_name = None
    seller_company_name = None

    if product_id:
        # I am the buyer, seller owns the product
        p_res = db.table("products").select("*").eq("id", product_id).execute()
        if not p_res.data:
            raise HTTPException(status_code=404, detail="Product not found")
        p = p_res.data[0]
        buyer_company_id = my_company_id
        supplier_company_id = p.get("companyId")
        buyer_uid = uid
        # Get seller uid from users table
        seller_res = db.table("users").select("firebase_uid").eq("companyId", supplier_company_id).execute()
        if seller_res.data:
            seller_uid = seller_res.data[0].get("firebase_uid")
        listing_type = "PRODUCT"
        commodity_name = p.get("name") or p.get("title") or "Commodity"
        listing_title = commodity_name
        quantity = p.get("quantity")
        unit = p.get("unit", "MT")
        price = p.get("price")
        origin_country = p.get("country")
    elif rfq_id:
        # I am the seller responding to a buyer's RFQ
        rfq_res = db.table("rfqs").select("*").eq("id", rfq_id).execute()
        if not rfq_res.data:
            raise HTTPException(status_code=404, detail="RFQ not found")
        rfq = rfq_res.data[0]
        buyer_company_id = rfq.get("buyerCompanyId")
        supplier_company_id = my_company_id
        seller_uid = uid
        buyer_res = db.table("users").select("firebase_uid").eq("companyId", buyer_company_id).execute()
        if buyer_res.data:
            buyer_uid = buyer_res.data[0].get("firebase_uid")
        listing_type = "RFQ"
        commodity_name = rfq.get("title") or rfq.get("product") or "RFQ Item"
        listing_title = commodity_name
        quantity = rfq.get("targetQuantity")
        unit = rfq.get("unit", "MT")
        price = rfq.get("targetPrice")
        origin_country = rfq.get("destinationCountry")
    else:
        raise HTTPException(status_code=400, detail="productId or rfqId required")

    # Fetch company names
    try:
        buyer_co = db.table("companies").select("name").eq("id", buyer_company_id).execute()
        buyer_company_name = buyer_co.data[0].get("name") if buyer_co.data else None
    except:
        pass
    try:
        seller_co = db.table("companies").select("name").eq("id", supplier_company_id).execute()
        seller_company_name = seller_co.data[0].get("name") if seller_co.data else None
    except:
        pass

    # Check for existing room (duplicate prevention)
    try:
        q = db.table("negotiation_rooms").select("*").eq("buyerCompanyId", buyer_company_id).eq("supplierCompanyId", supplier_company_id)
        if product_id:
            q = q.eq("productId", product_id)
        elif rfq_id:
            q = q.eq("rfqId", rfq_id)
        ex = q.execute()
        if ex.data:
            return _room_from_row(ex.data[0])
    except:
        pass

    # Create new room with full listing context
    now = datetime.datetime.utcnow().isoformat() + "Z"
    new_room = NegotiationRoom(
        buyerCompanyId=buyer_company_id,
        supplierCompanyId=supplier_company_id,
        rfqId=rfq_id,
        productId=product_id,
        listing_type=listing_type,
        listing_title=listing_title,
        commodity_name=commodity_name,
        quantity=quantity,
        unit=unit,
        price=price,
        buyer_company_name=buyer_company_name,
        seller_company_name=seller_company_name,
        origin_country=origin_country,
        last_message_at=now,
        buyer_user_id=buyer_uid,
        seller_user_id=seller_uid,
    )

    insert_data = {
        "id": new_room.id,
        "buyerCompanyId": new_room.buyerCompanyId,
        "supplierCompanyId": new_room.supplierCompanyId,
        "rfqId": new_room.rfqId,
        "productId": new_room.productId,
        "status": new_room.status,
        "listing_type": new_room.listing_type,
        "listing_title": new_room.listing_title,
        "commodity_name": new_room.commodity_name,
        "quantity": new_room.quantity,
        "unit": new_room.unit,
        "price": new_room.price,
        "buyer_company_name": new_room.buyer_company_name,
        "seller_company_name": new_room.seller_company_name,
        "origin_country": new_room.origin_country,
        "last_message_at": new_room.last_message_at,
        "unread_buyer": 0,
        "unread_seller": 0,
        "buyer_user_id": new_room.buyer_user_id,
        "seller_user_id": new_room.seller_user_id,
        "createdAt": new_room.createdAt,
        "updatedAt": new_room.updatedAt,
    }
    db.table("negotiation_rooms").insert(insert_data).execute()

    # System message
    sys_msg = Message(room_id=new_room.id, sender_id="system",
                      content=f"Negotiation started for {commodity_name}. Both parties can now exchange messages and formal offers.")
    db.table("messages").insert({
        "id": sys_msg.id, "room_id": sys_msg.room_id,
        "sender_id": sys_msg.sender_id, "content": sys_msg.content,
        "timestamp": sys_msg.timestamp
    }).execute()

    # Notify the other party
    try:
        notify_uid = seller_uid if listing_type == "PRODUCT" else buyer_uid
        if notify_uid:
            db.table("notifications").insert({
                "firebase_uid": notify_uid,
                "title": "New Negotiation Started",
                "message": f"A new negotiation has been started for '{commodity_name}'.",
                "type": "negotiation_started",
                "is_read": False
            }).execute()
    except Exception as e:
        print("Notice: notification insert failed:", e)

    return new_room


@app.get("/api/negotiations/rooms")
async def get_rooms(token_data: dict = Depends(verify_token)):
    db = get_db()
    uid = token_data.get("uid")
    res = db.table("users").select("*").eq("firebase_uid", uid).execute()
    if not res.data:
        return []
    c_id = res.data[0].get("companyId")
    my_uid = uid

    try:
        r_res = db.table("negotiation_rooms").select("*").or_(
            f"buyerCompanyId.eq.{c_id},supplierCompanyId.eq.{c_id}"
        ).order("last_message_at", desc=True).execute()
    except:
        r_res = db.table("negotiation_rooms").select("*").or_(
            f"buyerCompanyId.eq.{c_id},supplierCompanyId.eq.{c_id}"
        ).execute()

    out = []
    for e in r_res.data:
        room = _room_from_row(e)
        # Set unread count based on whether I'm buyer or seller
        if e.get("buyerCompanyId") != c_id:
            # I am the seller
            room.unread_buyer = 0  # not relevant to me
        else:
            room.unread_seller = 0  # not relevant to me
        out.append(room)
    return out


@app.get("/api/negotiations/rooms/{room_id}")
async def get_room(room_id: str, token_data: dict = Depends(verify_token)):
    db = get_db()
    ex = db.table("negotiation_rooms").select("*").eq("id", room_id).execute()
    if not ex.data:
        raise HTTPException(status_code=404, detail="Room not found")
    return _room_from_row(ex.data[0])


@app.put("/api/negotiations/rooms/{room_id}/status")
async def update_room_status(room_id: str, data: dict, token_data: dict = Depends(verify_token)):
    db = get_db()
    new_status = data.get("status", "CLOSED")
    now = datetime.datetime.utcnow().isoformat() + "Z"
    update_data = {"status": new_status, "updatedAt": now}
    if new_status == "ARCHIVED":
        update_data["archived_at"] = now
    db.table("negotiation_rooms").update(update_data).eq("id", room_id).execute()
    return {"status": new_status, "updated": True}


@app.post("/api/negotiations/rooms/{room_id}/read")
async def mark_room_read(room_id: str, token_data: dict = Depends(verify_token)):
    db = get_db()
    uid = token_data.get("uid")
    user_res = db.table("users").select("companyId").eq("firebase_uid", uid).execute()
    if not user_res.data:
        return {"ok": True}
    c_id = user_res.data[0].get("companyId")
    room_res = db.table("negotiation_rooms").select("buyerCompanyId").eq("id", room_id).execute()
    if room_res.data:
        if room_res.data[0].get("buyerCompanyId") == c_id:
            db.table("negotiation_rooms").update({"unread_buyer": 0}).eq("id", room_id).execute()
        else:
            db.table("negotiation_rooms").update({"unread_seller": 0}).eq("id", room_id).execute()
    return {"ok": True}


@app.get("/api/negotiations/rooms/{room_id}/messages")
async def get_messages(room_id: str, token_data: dict = Depends(verify_token)):
    db = get_db()
    m = db.table("messages").select("*").eq("room_id", room_id).order("timestamp").execute()
    out = []
    for x in m.data:
        out.append(Message(id=x["id"], room_id=x["room_id"], sender_id=x["sender_id"],
                           content=x.get("content"), offer_version=x.get("offer_version"),
                           timestamp=x.get("timestamp")))
    return out


@app.post("/api/negotiations/rooms/{room_id}/messages", response_model=Message)
async def send_room_message(room_id: str, data: dict, token_data: dict = Depends(verify_token)):
    db = get_db()
    uid = token_data.get("uid")
    content = data.get("content", "")

    msg = Message(room_id=room_id, sender_id=uid, content=content)
    db.table("messages").insert({
        "id": msg.id, "room_id": msg.room_id, "sender_id": msg.sender_id,
        "content": msg.content, "timestamp": msg.timestamp
    }).execute()

    # Update room last_message_at and unread count
    now = datetime.datetime.utcnow().isoformat() + "Z"
    try:
        room_res = db.table("negotiation_rooms").select("buyerCompanyId,supplierCompanyId,buyer_user_id,seller_user_id,commodity_name,unread_buyer,unread_seller").eq("id", room_id).execute()
        if room_res.data:
            r = room_res.data[0]
            user_res = db.table("users").select("companyId").eq("firebase_uid", uid).execute()
            my_company = user_res.data[0].get("companyId") if user_res.data else None
            is_buyer = r.get("buyerCompanyId") == my_company

            update_payload = {"last_message_at": now, "updatedAt": now}
            if is_buyer:
                update_payload["unread_seller"] = (r.get("unread_seller") or 0) + 1
                notify_uid = r.get("seller_user_id")
            else:
                update_payload["unread_buyer"] = (r.get("unread_buyer") or 0) + 1
                notify_uid = r.get("buyer_user_id")

            db.table("negotiation_rooms").update(update_payload).eq("id", room_id).execute()

            # Send notification to other party
            if notify_uid and notify_uid != uid:
                commodity = r.get("commodity_name", "your negotiation")
                db.table("notifications").insert({
                    "firebase_uid": notify_uid,
                    "title": "New Message",
                    "message": f"You have a new message in the negotiation for '{commodity}'.",
                    "type": "new_message",
                    "is_read": False
                }).execute()
    except Exception as e:
        print("Notice updating room last_message_at:", e)

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
        price=price, quantity=quantity, moq=moq,
        delivery_date=str(data.get("delivery_date") or data.get("deliveryDate") or "TBD"),
        packaging=str(data.get("packaging") or "Standard"),
        payment_terms=str(data.get("payment_terms") or data.get("paymentTerms") or "LC at sight"),
        incoterms=str(data.get("incoterms") or data.get("incoterm") or "FOB"),
        inspection=str(data.get("inspection") or "SGS / Independent"),
        destination=str(data.get("destination") or data.get("destination_port") or "Any"),
        validity_hours=validity_hours,
        remarks=str(data.get("remarks") or data.get("specifications") or "")
    )
    ov = OfferVersion(version=next_ver, created_by=uid,
                      timestamp=datetime.datetime.utcnow().isoformat() + "Z", card=card)

    msg = Message(room_id=room_id, sender_id=uid, content=f"Sent Offer v{next_ver}", offer_version=ov)
    db.table("messages").insert({
        "id": msg.id, "room_id": msg.room_id, "sender_id": msg.sender_id,
        "content": msg.content, "offer_version": msg.offer_version.model_dump() if msg.offer_version else None,
        "timestamp": msg.timestamp
    }).execute()

    # Update room last_message_at and notify other party
    now = datetime.datetime.utcnow().isoformat() + "Z"
    try:
        room_res = db.table("negotiation_rooms").select("buyerCompanyId,buyer_user_id,seller_user_id,commodity_name,unread_buyer,unread_seller").eq("id", room_id).execute()
        if room_res.data:
            r = room_res.data[0]
            user_res = db.table("users").select("companyId").eq("firebase_uid", uid).execute()
            my_company = user_res.data[0].get("companyId") if user_res.data else None
            is_buyer = r.get("buyerCompanyId") == my_company
            update_payload = {"last_message_at": now, "updatedAt": now}
            if is_buyer:
                update_payload["unread_seller"] = (r.get("unread_seller") or 0) + 1
                notify_uid = r.get("seller_user_id")
            else:
                update_payload["unread_buyer"] = (r.get("unread_buyer") or 0) + 1
                notify_uid = r.get("buyer_user_id")
            db.table("negotiation_rooms").update(update_payload).eq("id", room_id).execute()
            if notify_uid and notify_uid != uid:
                commodity = r.get("commodity_name", "a commodity")
                db.table("notifications").insert({
                    "firebase_uid": notify_uid,
                    "title": f"New Offer v{next_ver} Received",
                    "message": f"A formal offer (v{next_ver}) was submitted for '{commodity}'. Review and respond.",
                    "type": "offer_received",
                    "is_read": False
                }).execute()
    except Exception as e:
        print("Notice updating offer room:", e)

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

