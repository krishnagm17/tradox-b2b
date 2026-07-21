import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['tradox_db']
    users = await db.users.find().to_list(length=100)
    print(f"Total users found: {len(users)}")
    for u in users:
        print(f"Email: {u.get('email')}, Commodities: '{u.get('commodities')}'")

if __name__ == "__main__":
    asyncio.run(run())
