from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

# User data is owned by the auth-service (auth-db). This service stores only
# plain user ids (no foreign keys across databases) and resolves user info
# through the auth-service HTTP API when needed.

class Chat(Base):
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    is_group = Column(Boolean, default=False, nullable=False)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow)

    members = relationship("ChatMember", back_populates="chat")

class ChatMember(Base):
    __tablename__ = "chat_members"
    user_id = Column(Integer, primary_key=True)
    chat_id = Column(Integer, ForeignKey("chats.id"), primary_key=True)

    chat = relationship("Chat", back_populates="members")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    sender_id = Column(Integer)
    # Denormalized at send time from the JWT, so listing messages needs no
    # join and no call to the auth-service.
    sender_username = Column(String, nullable=False, default="")
    content = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP, default=datetime.utcnow)

    offline_queue = relationship("OfflineQueue", back_populates="message", cascade="all, delete-orphan")

    @property
    def user_username(self):
        return self.sender_username or "Deleted User"

class OfflineQueue(Base):
    __tablename__ = "offline_queue"
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True)
    recipient_id = Column(Integer, primary_key=True)
    status = Column(String, default="pending", nullable=False)

    message = relationship("Message", back_populates="offline_queue")
