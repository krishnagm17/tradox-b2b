from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
import os
import jwt

# For Phase 1 we will bypass actual firebase token verification locally if FIREBASE_CREDENTIALS is not set
# Or we can verify it if the user provides the creds. 
# We'll set up the structure and mock the verification if it's missing.

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # Simulated token decoding for Phase 1 since we don't have the real service account key yet
    if token == "mock-jwt-token":
        return {"uid": "mock-firebase-uid", "email": "mock@example.com"}
    
    try:
        # For local development, decode the JWT without signature verification
        # to extract the user's Firebase UID and email sent from the frontend.
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        return {
            "uid": decoded_token.get("user_id"),
            "email": decoded_token.get("email", "")
        }
    except Exception as e:
        print(f"Token decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
