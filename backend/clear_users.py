import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['tradox_db']
    result = await db.users.delete_many({})
    print(f"Deleted {result.deleted_count} users")

if __name__ == "__main__":
    asyncio.run(run())
