from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import uuid, datetime

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    rooms = relationship("RoomMember", back_populates="user")

class Room(Base):
    __tablename__ = "rooms"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    language = Column(String, default="python")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    members = relationship("RoomMember", back_populates="room")
    files = relationship("File", back_populates="room")

class RoomMember(Base):
    __tablename__ = "room_members"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    role = Column(Enum("owner", "editor", "viewer", name="role_enum"), default="editor")
    room = relationship("Room", back_populates="members")
    user = relationship("User", back_populates="rooms")

class File(Base):
    __tablename__ = "files"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"))
    name = Column(String, nullable=False)
    content = Column(Text, default="")
    language = Column(String, default="python")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
    room = relationship("Room", back_populates="files")
    snapshots = relationship("Snapshot", back_populates="file")

class Snapshot(Base):
    __tablename__ = "snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id"))
    content = Column(Text)
    saved_at = Column(DateTime, default=datetime.datetime.utcnow)
    file = relationship("File", back_populates="snapshots")