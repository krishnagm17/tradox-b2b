from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Header
from typing import Optional
import os
import uuid
from datetime import datetime

# Assume supabase client and auth verification can be imported from server or auth module.
# In this codebase, we can import them from auth (verify_token) and a new db wrapper or directly from server (not ideal due to circular).
# Let's import supabase from server directly, or create a quick supabase instance here since they use dotenv.
from supabase import create_client, Client
from auth import verify_token
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None

router = APIRouter(prefix="/api")

@router.post("/kyb/submit")
async def submit_kyb(
    file: UploadFile = File(...),
    company_name: str = Form(...),
    gst_number: Optional[str] = Form(None),
    iec_number: Optional[str] = Form(None),
    token_data: dict = Depends(verify_token)
):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    uid = token_data.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    email = token_data.get("email") or "user@tradox.b2b"
    user_name = token_data.get("name") or token_data.get("full_name") or email.split("@")[0]
    
    # Validate file
    allowed_types = ["application/pdf", "image/jpeg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPG, PNG allowed.")
        
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
        
    # Upload to Supabase Storage
    file_ext = file.filename.split(".")[-1]
    storage_path = f"{uid}/{uuid.uuid4()}.{file_ext}"
    
    try:
        supabase.storage.from_("kyb-documents").upload(
            file=file_content,
            path=storage_path,
            file_options={"content-type": file.content_type}
        )
    except Exception as e:
        print("Upload Error:", e)
        # It might already exist or bucket not created
        pass

    doc_url = f"kyb-documents/{storage_path}" # Save bucket+path
    now_str = datetime.utcnow().isoformat()
    
    # Check for existing request
    existing = supabase.table("kyb_requests").select("*").eq("firebase_uid", uid).execute()
    
    request_data = {
        "firebase_uid": uid,
        "company_name": company_name,
        "user_name": user_name,
        "user_email": email,
        "gst_number": gst_number,
        "iec_number": iec_number,
        "document_url": doc_url,
        "document_name": file.filename,
        "document_size": len(file_content),
        "status": "Pending",
        "submitted_at": now_str
    }
    
    if existing.data:
        # User already has a request, update it to pending again
        res = supabase.table("kyb_requests").update(request_data).eq("firebase_uid", uid).execute()
    else:
        # Get company id from users table if exists
        user_db = supabase.table("users").select("companyId").eq("firebase_uid", uid).execute()
        if user_db.data:
            request_data["company_id"] = user_db.data[0].get("companyId")
            
        res = supabase.table("kyb_requests").insert(request_data).execute()
        
    # Also update users table kybStatus for backwards compatibility
    supabase.table("users").update({"kybStatus": "PENDING"}).eq("firebase_uid", uid).execute()
    
    # Create notification for admins
    # 1. Fetch all admins
    admins = supabase.table("admin_users").select("firebase_uid").execute()
    if admins.data:
        notifs = []
        for admin in admins.data:
            notifs.append({
                "firebase_uid": admin["firebase_uid"],
                "title": "New KYB Submission",
                "message": f"{company_name} submitted KYB documents for review.",
                "type": "kyb_alert"
            })
        if notifs:
            supabase.table("notifications").insert(notifs).execute()
            
    return {"status": "success", "message": "KYB submitted successfully"}


@router.get("/kyb/status")
async def get_kyb_status(token_data: dict = Depends(verify_token)):
    uid = token_data.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    res = supabase.table("kyb_requests").select("*").eq("firebase_uid", uid).execute()
    if not res.data:
        return {"status": "Not Submitted"}
        
    req = res.data[0]
    # Return formatted status
    return {
        "status": req.get("status"),
        "document_name": req.get("document_name"),
        "submitted_at": req.get("submitted_at"),
        "approved_at": req.get("approved_at"),
        "rejected_at": req.get("rejected_at"),
        "rejection_reason": req.get("rejection_reason")
    }

# --- ADMIN ROUTES ---

def verify_admin(token_data: dict):
    uid = token_data.get("uid")
    email = token_data.get("email")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    # Hardcoded Platform Owners bypass DB check
    SUPER_OWNERS = ["krishnametri223344@gmail.com", "owner@tradoxb2b.com"]
    if email in SUPER_OWNERS:
        return {"id": "super", "role": "OWNER", "email": email, "firebase_uid": uid}
        
    if email:
        admin_check = supabase.table("admin_users").select("*").eq("email", email.strip().lower()).execute()
        if admin_check.data:
            return admin_check.data[0]
            
    admin_check = supabase.table("admin_users").select("*").eq("firebase_uid", uid).execute()
    if not admin_check.data:
        raise HTTPException(status_code=403, detail="Admin access required")
    return admin_check.data[0]

@router.get("/admin/kyb")
async def get_all_kyb_requests(token_data: dict = Depends(verify_token)):
    verify_admin(token_data)
    res = supabase.table("kyb_requests").select("*").order("submitted_at", desc=True).execute()
    return {"data": res.data}

@router.get("/admin/kyb/{request_id}/document")
async def get_kyb_document_url(request_id: str, token_data: dict = Depends(verify_token)):
    verify_admin(token_data)
    req = supabase.table("kyb_requests").select("document_url").eq("id", request_id).execute()
    if not req.data or not req.data[0].get("document_url"):
        raise HTTPException(status_code=404, detail="Document not found")
        
    doc_path = req.data[0]["document_url"].replace("kyb-documents/", "")
    try:
        # Create a signed URL valid for 5 minutes (300 seconds)
        signed = supabase.storage.from_("kyb-documents").create_signed_url(doc_path, 300)
        return {"url": signed.get("signedURL")}
    except Exception as e:
        print("Signed URL Error:", e)
        raise HTTPException(status_code=500, detail="Could not generate signed URL")

@router.post("/admin/kyb/{request_id}/approve")
async def approve_kyb(request_id: str, token_data: dict = Depends(verify_token)):
    admin = verify_admin(token_data)
    now_str = datetime.utcnow().isoformat()
    
    req = supabase.table("kyb_requests").update({
        "status": "Approved",
        "approved_by": admin.get("email"),
        "approved_at": now_str
    }).eq("id", request_id).execute()
    
    if req.data:
        user_uid = req.data[0].get("firebase_uid")
        company_name = req.data[0].get("company_name")
        # Update users table
        supabase.table("users").update({"kybStatus": "VERIFIED"}).eq("firebase_uid", user_uid).execute()
        # Notify user
        supabase.table("notifications").insert({
            "firebase_uid": user_uid,
            "title": "KYB Approved",
            "message": f"Your KYB documents for {company_name} have been approved.",
            "type": "kyb_update"
        }).execute()
        
    return {"status": "success"}

@router.post("/admin/kyb/{request_id}/reject")
async def reject_kyb(request_id: str, payload: dict, token_data: dict = Depends(verify_token)):
    admin = verify_admin(token_data)
    reason = payload.get("reason", "No reason provided")
    now_str = datetime.utcnow().isoformat()
    
    req = supabase.table("kyb_requests").update({
        "status": "Rejected",
        "rejected_by": admin.get("email"),
        "rejected_at": now_str,
        "rejection_reason": reason
    }).eq("id", request_id).execute()
    
    if req.data:
        user_uid = req.data[0].get("firebase_uid")
        company_name = req.data[0].get("company_name")
        # Update users table
        supabase.table("users").update({"kybStatus": "REJECTED"}).eq("firebase_uid", user_uid).execute()
        # Notify user
        supabase.table("notifications").insert({
            "firebase_uid": user_uid,
            "title": "KYB Rejected",
            "message": f"Your KYB for {company_name} was rejected. Reason: {reason}",
            "type": "kyb_update"
        }).execute()
        
    return {"status": "success"}

# --- ADMIN PERMISSIONS ---
@router.post("/admin/grant")
async def grant_admin(payload: dict, token_data: dict = Depends(verify_token)):
    admin = verify_admin(token_data)
    if admin.get("role") != "OWNER":
        raise HTTPException(status_code=403, detail="Only platform owner can grant access")
        
    target_email = payload.get("email")
    if not target_email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    # Check if target exists in firebase (via users table in supabase)
    user_check = supabase.table("users").select("*").eq("email", target_email).execute()
    if not user_check.data:
        raise HTTPException(status_code=404, detail="User not found in system")
        
    target_uid = user_check.data[0].get("firebase_uid")
    target_name = user_check.data[0].get("name") or target_email.split("@")[0]
    
    # Check if already admin
    existing = supabase.table("admin_users").select("*").eq("email", target_email).execute()
    if existing.data:
        return {"status": "success", "message": "User is already an admin"}
        
    supabase.table("admin_users").insert({
        "firebase_uid": target_uid,
        "email": target_email,
        "name": target_name,
        "role": "ADMIN",
        "created_by": admin.get("email")
    }).execute()
    
    return {"status": "success"}

@router.get("/admin/list")
async def list_admins(token_data: dict = Depends(verify_token)):
    admin = verify_admin(token_data)
    res = supabase.table("admin_users").select("*").execute()
    return {"data": res.data, "role": admin.get("role")}

@router.delete("/admin/revoke/{admin_id}")
async def revoke_admin(admin_id: str, token_data: dict = Depends(verify_token)):
    admin = verify_admin(token_data)
    if admin.get("role") != "OWNER":
        raise HTTPException(status_code=403, detail="Only platform owner can revoke access")
        
    supabase.table("admin_users").delete().eq("id", admin_id).execute()
    return {"status": "success"}

# --- NOTIFICATIONS ---
@router.get("/notifications")
async def get_notifications(token_data: dict = Depends(verify_token)):
    uid = token_data.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    res = supabase.table("notifications").select("*").eq("firebase_uid", uid).order("created_at", desc=True).limit(50).execute()
    return {"data": res.data}

@router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, token_data: dict = Depends(verify_token)):
    uid = token_data.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    supabase.table("notifications").update({"is_read": True}).eq("id", notif_id).eq("firebase_uid", uid).execute()
    return {"status": "success"}
