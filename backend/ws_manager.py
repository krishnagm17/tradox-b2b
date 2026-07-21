from fastapi import WebSocket
from typing import List, Dict

class ConnectionManager:
    def __init__(self):
        # Global connections
        self.active_connections: List[WebSocket] = []
        # Room-specific connections: room_id -> List[WebSocket]
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if room_id:
            if room_id not in self.rooms:
                self.rooms[room_id] = []
            self.rooms[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if room_id and room_id in self.rooms:
            if websocket in self.rooms[room_id]:
                self.rooms[room_id].remove(websocket)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        """Global broadcast (used for live-board)"""
        for connection in self.active_connections:
            await connection.send_json(message)

    async def broadcast_to_room(self, room_id: str, message: dict, sender: WebSocket = None):
        """Broadcast only to users in a specific room"""
        if room_id in self.rooms:
            for connection in self.rooms[room_id]:
                # If you want to exclude sender: if connection != sender:
                await connection.send_json(message)

manager = ConnectionManager()
