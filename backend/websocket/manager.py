from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[dict]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user: dict):
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = []
        self.rooms[room_id].append({"ws": websocket, "user": user})

    async def disconnect(self, websocket: WebSocket, room_id: str, user: dict):
        if room_id in self.rooms:
            self.rooms[room_id] = [
                c for c in self.rooms[room_id] if c["ws"] != websocket
            ]
        # Broadcast updated user list to remaining users
        await self.broadcast(room_id, {
            "type": "presence_update",
            "active_users": self.get_active_users(room_id),
            "user_left": user
        })

    async def broadcast(self, room_id: str, message: dict, exclude: WebSocket = None):
        if room_id not in self.rooms:
            return
        dead = []
        for conn in self.rooms[room_id]:
            if conn["ws"] == exclude:
                continue
            try:
                await conn["ws"].send_text(json.dumps(message))
            except Exception:
                dead.append(conn)
        # Clean up dead connections
        for d in dead:
            self.rooms[room_id].remove(d)

    def get_active_users(self, room_id: str):
        return [c["user"] for c in self.rooms.get(room_id, [])]

manager = ConnectionManager()