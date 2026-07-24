from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import uuid
import datetime

class Company(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    companyName: str
    gst: Optional[str] = None
    iec: Optional[str] = None
    country: str = "India"
    businessCategory: str = "Wholesale Trading"
    verified: bool = False
    rating: float = 0.0
    logo: Optional[str] = None
    address: str = "Registered Address"
    commodities: str = ""
    kybStatus: str = "PENDING"  # PENDING, SUBMITTED, VERIFIED
    kybData: Optional[Dict] = None
    createdAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    firebase_uid: str
    companyId: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str = "ADMIN" # ADMIN, MEMBER
    kybStatus: str = "PENDING"
    companyName: Optional[str] = None
    company_name: Optional[str] = None
    createdAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")

class UserCreate(BaseModel):
    firebase_uid: str
    email: str
    name: str
    phone: Optional[str] = None
    # Company info bundled in registration
    companyName: str
    gst: Optional[str] = None
    iec: Optional[str] = None
    country: str = "India"
    businessCategory: str = "Wholesale Trading"
    address: str = "Registered Address"

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    companyId: str
    createdBy: str # firebase_uid
    category: str
    name: str
    description: Optional[str] = None
    price: float
    currency: str = "USD"
    unit: str = "MT"
    quantity: float
    images: List[str] = []
    video: Optional[str] = None
    country: str
    hsCode: Optional[str] = None
    moq: float
    deliveryTerms: str = "FOB"
    status: str = "LIVE"
    createdAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")

class ProductCreate(BaseModel):
    category: str
    name: str
    description: Optional[str] = None
    price: float
    currency: str = "USD"
    unit: str = "MT"
    quantity: float
    country: str
    hsCode: Optional[str] = None
    moq: float
    deliveryTerms: str = "FOB"

class RFQ(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    companyId: str
    createdBy: str
    product: str
    category: str
    quantity: float
    unit: str = "MT"
    targetPrice: Optional[float] = None
    destinationCountry: str
    deliveryDate: str
    description: Optional[str] = None
    attachments: List[str] = []
    status: str = "OPEN"
    createdAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")

class RFQCreate(BaseModel):
    product: str
    category: str
    quantity: float
    unit: str = "MT"
    targetPrice: Optional[float] = None
    destinationCountry: str
    deliveryDate: str
    description: Optional[str] = None

class Quote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rfqId: str
    supplierCompanyId: str
    buyerCompanyId: str
    price: float
    leadTime: str
    paymentTerms: str
    remarks: Optional[str] = None
    status: str = "PENDING"
    createdAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")

class NegotiationRoom(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    buyerCompanyId: str
    supplierCompanyId: str
    rfqId: Optional[str] = None
    productId: Optional[str] = None
    status: str = "ACTIVE"
    createdAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")

class OfferCard(BaseModel):
    price: float = 0.0
    quantity: float = 0.0
    moq: float = 1.0
    delivery_date: str = "TBD"
    packaging: str = "Standard"
    payment_terms: str = "LC at sight"
    incoterms: str = "FOB"
    inspection: str = "SGS / Independent"
    destination: str = "Any"
    validity_hours: int = 24
    remarks: Optional[str] = None

class OfferVersion(BaseModel):
    version: int
    created_by: str
    timestamp: str
    card: OfferCard

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    sender_id: str # firebase_uid or "system"
    content: Optional[str] = None
    offer_version: Optional[OfferVersion] = None
    attachment_url: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")
    read: bool = False

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    buyerCompanyId: str
    supplierCompanyId: str
    negotiationId: str
    status: str = "CREATED"  # CREATED, ESCROW, DISPATCH, DELIVERED
    stage: int = 2  # 0=Verification, 1=Price Discovery, 2=Negotiation, 3=Escrow, 4=Dispatch, 5=Delivery
    totalAmount: float
    commodity: Optional[str] = None
    quantity: Optional[float] = None
    unit: str = "MT"
    price: Optional[float] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    incoterms: Optional[str] = None
    invoiceId: Optional[str] = None
    trackingNumber: Optional[str] = None
    pdf_url: Optional[str] = None
    createdAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")
