from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from database import engine, get_db
from models import Base, File, Snapshot
from websocket.manager import manager
from websocket.ot_engine import apply_operation
from routers import auth, rooms, files, execute
from auth import decode_token
from sqlalchemy.orm import Session
import json, datetime, os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Collaborative Code Editor")

# Custom CORS middleware that handles everything
class CORSMiddlewareCustom(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            from starlette.responses import Response
            response = Response()
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
            return response
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

app.add_middleware(CORSMiddlewareCustom)

app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(files.router)
app.include_router(execute.router)

op_counters = {}

@app.get("/")
def root():
    return {"status": "CollabEditor API running ✅"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.websocket("/ws/{room_id}/{file_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    file_id: str,
    token: str = Query(...)
):
    try:
        user = decode_token(token)
    except Exception:
        await websocket.close(code=1008)
        return

    user_info = {"id": user["sub"], "username": user["username"]}
    await manager.connect(websocket, room_id, user_info)

    db: Session = next(get_db())

    try:
        file = db.query(File).filter(File.id == file_id).first()
        if not file:
            await websocket.close(code=1003)
            return

        await websocket.send_text(json.dumps({
            "type": "init",
            "content": file.content,
            "active_users": manager.get_active_users(room_id)
        }))

        await manager.broadcast(room_id, {
            "type": "user_joined",
            "user": user_info,
            "active_users": manager.get_active_users(room_id)
        }, exclude=websocket)

        if file_id not in op_counters:
            op_counters[file_id] = 0

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] in ("insert", "delete", "full_sync"):
                file = db.query(File).filter(File.id == file_id).first()
                file.content = apply_operation(file.content, message)
                file.updated_at = datetime.datetime.utcnow()
                db.add(file)
                db.commit()

                op_counters[file_id] += 1
                if op_counters[file_id] >= 100:
                    snap = Snapshot(file_id=file_id, content=file.content)
                    db.add(snap)
                    db.commit()
                    op_counters[file_id] = 0

                await manager.broadcast(room_id, {
                    "type": message["type"],
                    "op": message,
                    "user": user["username"]
                }, exclude=websocket)

            elif message["type"] == "cursor":
                await manager.broadcast(room_id, {
                    "type": "cursor",
                    "user": user["username"],
                    "user_id": user["sub"],
                    "pos": message["pos"]
                }, exclude=websocket)

            elif message["type"] == "chat":
                await manager.broadcast(room_id, {
                    "type": "chat",
                    "user": user["username"],
                    "text": message["text"]
                }, exclude=websocket)

    except WebSocketDisconnect:
        await manager.disconnect(websocket, room_id, user_info)
        db.close()
    except Exception as e:
        print(f"WS Error: {e}")
        await manager.disconnect(websocket, room_id, user_info)
        db.close()