import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def drop_collections():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["tradox_db"]
    collections = await db.list_collection_names()
    for coll in collections:
        print(f"Dropping collection {coll}...")
        await db[coll].drop()
    print("All collections dropped successfully.")

if __name__ == "__main__":
    asyncio.run(drop_collections())
