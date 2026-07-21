import requests
import json

data = {
    "firebase_uid": "test1234",
    "email": "test@example.com",
    "full_name": "Test User",
    "company_name": "Test Co",
    "phone": "+1234567890",
    "country": "USA",
    "role": "BUYER",
    "commodities": "Gold Bullion"
}

# The user is running the backend, so we can test the live endpoint!
# But wait, it needs a valid Firebase token to pass verify_token dependency!
# We can just look at the models.py directly to see if Pydantic rejects it.
from models import UserCreate
try:
    user = UserCreate(**data)
    print("Pydantic accepted it:", user)
except Exception as e:
    print("Pydantic rejected it:", e)
