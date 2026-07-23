from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from typing import List, Dict, Any
import os
import asyncio
import datetime

from models import UserCreate, User, Company, Product, ProductCreate, RFQCreate, RFQ, NegotiationRoom, Message, Quote, Order, OfferCard, OfferVersion
from auth import verify_token
from ws_manager import manager
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

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

def get_db():
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured in .env")
    return supabase

@app.get("/")
def read_root():
    return {"message": "TradoxB2B API is running on Supabase"}

@app.post("/api/users", response_model=User)
async def create_user(user_data: UserCreate, token_data: dict = Depends(verify_token)):
    firebase_uid = user_data.firebase_uid
    db = get_db()
    
    existing = db.table("users").select("*").eq("firebase_uid", firebase_uid).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="User already exists")
        
    company = Company(
        companyName=user_data.companyName,
        gst=user_data.gst,
        iec=user_data.iec,
        country=user_data.country,
        businessCategory=user_data.businessCategory,
        address=user_data.address
    )
    
    db.table("companies").insert({
        "id": company.id,
        "name": company.companyName,
        "type": company.businessCategory,
        "verificationStatus": company.kybStatus,
        "createdAt": company.createdAt
    }).execute()
    
    user = User(
        firebase_uid=firebase_uid,
        companyId=company.id,
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone
    )
    
    db.table("users").insert({
        "id": user.id,
        "firebase_uid": user.firebase_uid,
        "email": user.email,
        "role": user.role,
        "companyId": user.companyId,
        "kybStatus": "PENDING",
        "createdAt": user.createdAt
    }).execute()
    
    return user

@app.get("/api/users/me", response_model=User)
async def get_me(token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    u = res.data[0]
    
    kyb_status = u.get("kybStatus", "PENDING")
    if kyb_status != "VERIFIED" and u.get("companyId"):
        c_res = db.table("companies").select("*").eq("id", u["companyId"]).execute()
        if c_res.data and c_res.data[0].get("verificationStatus") == "VERIFIED":
            kyb_status = "VERIFIED"
            
    return User(id=u["id"], firebase_uid=u["firebase_uid"], companyId=u["companyId"], name="User", email=u["email"], role=u["role"], kybStatus=kyb_status)

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
        
    product = Product(**product_data.model_dump(), companyId=res.data[0]["companyId"], createdBy=token_data.get("uid"))
    
    db.table("products").insert({
        "id": product.id,
        "companyId": product.companyId,
        "title": product.name,
        "description": product.description,
        "category": product.category,
        "price": product.price,
        "moq": product.moq,
        "createdAt": product.createdAt
    }).execute()
    return product

@app.get("/api/products", response_model=List[Product])
async def get_products():
    db = get_db()
    res = db.table("products").select("*").execute()
    out = []
    for p in res.data:
        out.append(Product(id=p["id"], companyId=p["companyId"], createdBy="", category=p.get("category",""), name=p.get("title",""), description=p.get("description"), price=p.get("price",0), quantity=0, country="", moq=p.get("moq",0)))
    return out

@app.post("/api/rfqs", response_model=RFQ)
async def create_rfq(rfq_data: RFQCreate, token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    rfq = RFQ(**rfq_data.model_dump(), companyId=res.data[0]["companyId"], createdBy=token_data.get("uid"))
    
    db.table("rfqs").insert({
        "id": rfq.id,
        "buyerCompanyId": rfq.companyId,
        "title": rfq.product,
        "description": rfq.description,
        "category": rfq.category,
        "targetPrice": rfq.targetPrice,
        "targetQuantity": rfq.quantity,
        "status": rfq.status,
        "createdAt": rfq.createdAt
    }).execute()
    return rfq

@app.get("/api/rfqs", response_model=List[RFQ])
async def get_rfqs():
    db = get_db()
    res = db.table("rfqs").select("*").execute()
    out = []
    for r in res.data:
        out.append(RFQ(id=r["id"], companyId=r["buyerCompanyId"], createdBy="", product=r.get("title",""), category=r.get("category",""), quantity=r.get("targetQuantity",0), targetPrice=r.get("targetPrice"), destinationCountry="", deliveryDate="", description=r.get("description")))
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

@app.post("/api/users/kyb")
async def kyb(token_data: dict = Depends(verify_token)):
    db = get_db()
    res = db.table("users").select("*").eq("firebase_uid", token_data.get("uid")).execute()
    if res.data:
        company_id = res.data[0].get("companyId")
        if company_id:
            db.table("companies").update({"verificationStatus": "VERIFIED"}).eq("id", company_id).execute()
        db.table("users").update({"kybStatus": "VERIFIED"}).eq("firebase_uid", token_data.get("uid")).execute()
    return {"status": "success"}

@app.post("/api/negotiations/rooms/{room_id}/accept", response_model=Order)
async def accept_offer(room_id: str, data: dict = Body(default={}), token_data: dict = Depends(verify_token)):
    db = get_db()
    uid = token_data.get("uid", "user")
    version = data.get("version", 1) if isinstance(data, dict) else 1
    
    try:
        db.table("negotiation_rooms").update({"status": "ACCEPTED"}).eq("id", room_id).execute()
    except Exception as e:
        print("Notice: room status update exception:", e)
    
    try:
        msg = Message(room_id=room_id, sender_id="system", content=f"Formal Offer v{version} was ACCEPTED. Contract generated.")
        db.table("messages").insert({
            "id": msg.id,
            "room_id": msg.room_id,
            "sender_id": msg.sender_id,
            "content": msg.content,
            "timestamp": msg.timestamp
        }).execute()
        
        await manager.broadcast_to_room(room_id, {"type": "chat", "message": msg.model_dump()})
    except Exception as e:
        print("Notice: message broadcast exception:", e)
    
    order = Order(
        id=str(uuid.uuid4()),
        buyerCompanyId="buyer-company",
        supplierCompanyId="supplier-company",
        negotiationId=room_id,
        totalAmount=968.0,
        status="ACCEPTED",
        stage=3
    )
    return order

@app.get("/api/orders/me", response_model=List[Order])
async def get_my_orders():
    return []

@app.get("/api/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, token_data: dict = Depends(verify_token)):
    return Order(id=order_id, buyerCompanyId="", supplierCompanyId="", negotiationId="", stage=1, status="ACTIVE", totalAmount=968.0)

@app.post("/api/orders/{order_id}/stage")
async def update_order_stage(order_id: str):
    return {"status": "success"}
