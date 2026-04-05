from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import File, Snapshot
from auth import get_current_user
from pydantic import BaseModel
import datetime

router = APIRouter(prefix="/files", tags=["files"])

class FileCreate(BaseModel):
    room_id: str
    name: str
    language: str = "python"

class FileDelete(BaseModel):
    file_id: str

@router.post("/")
def create_file(data: FileCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    file = File(room_id=data.room_id, name=data.name, language=data.language, content="")
    db.add(file)
    db.commit()
    db.refresh(file)
    return {"file_id": str(file.id), "name": file.name}

@router.get("/{file_id}")
def get_file(file_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    file = db.query(File).filter(File.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return {"file_id": str(file.id), "name": file.name,
            "content": file.content, "language": file.language}

@router.delete("/{file_id}")
def delete_file(file_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    file = db.query(File).filter(File.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    db.delete(file)
    db.commit()
    return {"message": "File deleted"}

@router.get("/{file_id}/history")
def get_history(file_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    snapshots = db.query(Snapshot).filter(Snapshot.file_id == file_id)\
        .order_by(Snapshot.saved_at.desc()).limit(20).all()
    return [{"id": str(s.id), "saved_at": s.saved_at, "preview": s.content[:120]} for s in snapshots]

@router.post("/{file_id}/snapshot")
def save_snapshot(file_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    file = db.query(File).filter(File.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    snap = Snapshot(file_id=file_id, content=file.content)
    db.add(snap)
    db.commit()
    return {"message": "Snapshot saved"}

@router.post("/{file_id}/restore/{snapshot_id}")
def restore_snapshot(file_id: str, snapshot_id: str,
                     db: Session = Depends(get_db), user=Depends(get_current_user)):
    snap = db.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    file = db.query(File).filter(File.id == file_id).first()
    file.content = snap.content
    file.updated_at = datetime.datetime.utcnow()
    db.commit()
    return {"message": "Restored", "content": snap.content}