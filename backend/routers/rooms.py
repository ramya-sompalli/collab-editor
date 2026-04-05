from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Room, RoomMember, File
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/rooms", tags=["rooms"])

class RoomCreate(BaseModel):
    name: str
    language: str = "python"

class JoinRoom(BaseModel):
    room_id: str

@router.post("/")
def create_room(data: RoomCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    room = Room(name=data.name, owner_id=user["sub"], language=data.language)
    db.add(room)
    db.flush()
    member = RoomMember(room_id=room.id, user_id=user["sub"], role="owner")
    default_file = File(room_id=room.id, name="main.py",
                        content="# Start coding here\n", language=data.language)
    db.add(member)
    db.add(default_file)
    db.commit()
    db.refresh(room)
    return {"room_id": str(room.id), "name": room.name, "language": room.language}

@router.post("/join")
def join_room(data: JoinRoom, db: Session = Depends(get_db), user=Depends(get_current_user)):
    room = db.query(Room).filter(Room.id == data.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    existing = db.query(RoomMember).filter(
        RoomMember.room_id == data.room_id,
        RoomMember.user_id == user["sub"]
    ).first()
    if not existing:
        member = RoomMember(room_id=room.id, user_id=user["sub"], role="editor")
        db.add(member)
        db.commit()
    return {"room_id": str(room.id), "name": room.name}

@router.get("/")
def list_rooms(db: Session = Depends(get_db), user=Depends(get_current_user)):
    memberships = db.query(RoomMember).filter(RoomMember.user_id == user["sub"]).all()
    return [{"room_id": str(m.room.id), "name": m.room.name, "role": m.role} for m in memberships]

@router.get("/{room_id}")
def get_room(room_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    member = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == user["sub"]
    ).first()
    role = member.role if member else "viewer"
    files = [{"id": str(f.id), "name": f.name, "language": f.language} for f in room.files]
    return {"room_id": str(room.id), "name": room.name,
            "language": room.language, "files": files, "role": role}

@router.delete("/{room_id}/leave")
def leave_room(room_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    member = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == user["sub"]
    ).first()
    if member:
        db.delete(member)
        db.commit()
    return {"message": "Left room"}