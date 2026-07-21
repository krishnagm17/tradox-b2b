import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import uuid
import datetime

def generate_contract_pdf(room_id: str, offer_card: dict, buyer_id: str, supplier_id: str) -> str:
    # Ensure static directory exists
    static_dir = os.path.join(os.path.dirname(__file__), "static", "contracts")
    os.makedirs(static_dir, exist_ok=True)
    
    filename = f"contract_{room_id}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(static_dir, filename)
    
    c = canvas.Canvas(filepath, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, height - 50, "B2B SALES CONTRACT")
    
    # Meta Info
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 80, f"Date: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    c.drawString(50, height - 95, f"Room ID: {room_id}")
    c.drawString(50, height - 110, f"Buyer ID: {buyer_id}")
    c.drawString(50, height - 125, f"Supplier ID: {supplier_id}")
    
    c.line(50, height - 140, width - 50, height - 140)
    
    # Offer Details
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 170, "AGREED TERMS")
    
    c.setFont("Helvetica", 12)
    y = height - 200
    line_height = 20
    
    details = [
        f"Unit Price: ${offer_card.get('price')} / MT",
        f"Quantity: {offer_card.get('quantity')} MT",
        f"Total Value: ${float(offer_card.get('price', 0)) * float(offer_card.get('quantity', 0))}",
        f"Incoterms: {offer_card.get('incoterms')}",
        f"Payment Terms: {offer_card.get('payment_terms')}",
        f"Destination: {offer_card.get('destination')}",
        f"Delivery Date: {offer_card.get('delivery_date')}",
        f"Inspection: {offer_card.get('inspection')}",
        f"Packaging: {offer_card.get('packaging')}"
    ]
    
    for detail in details:
        c.drawString(70, y, detail)
        y -= line_height
        
    c.line(50, y - 20, width - 50, y - 20)
    
    # Signatures
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y - 60, "Digitally Signed and Sealed by B2B Emergent Platform.")
    
    c.save()
    
    return f"/static/contracts/{filename}"
