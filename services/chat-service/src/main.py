from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.orm.session import sessionmaker
from typing import List, Optional
import httpx
import os
from datetime import datetime

from .auth_deps import get_current_user_id, get_token_payload
from .models import Base, Chat, ChatMember, Message, OfflineQueue
from .schemas import UserOut, ChatOut, ChatCreate, MessageOut, MessageCreate;

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@chat-db:5432/chatapp")
# User data lives in the auth-service; resolved over HTTP, never via SQL.
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8000")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


async def fetch_users_from_auth(ids: Optional[List[int]] = None) -> List[dict]:
    params = {"ids": ",".join(str(i) for i in ids)} if ids else None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(f"{AUTH_SERVICE_URL}/api/auth/users", params=params)
    except httpx.HTTPError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="auth-service unavailable")
    if res.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="auth-service returned an error")
    return res.json()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="chat-service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app)

@app.get("/api/users", response_model=List[UserOut])
async def get_all_users():
    # Same contract the frontend always used, now proxied to the data owner.
    return await fetch_users_from_auth()

@app.get("/api/chats/me", response_model=List[ChatOut])
async def get_user_chats(authorization: str = Header(...), db: Session = Depends(get_db)):
    current_user_id = await get_current_user_id(authorization.split(" ")[1])
    chats = db.query(Chat).join(ChatMember, Chat.id == ChatMember.chat_id).filter(ChatMember.user_id == current_user_id).order_by(Chat.updated_at.desc()).all()

    result = []
    for chat in chats:
        unread_message_count = db.query(OfflineQueue).join(
            Message, OfflineQueue.message_id == Message.id
        ).filter(
            Message.chat_id == chat.id,
            OfflineQueue.recipient_id == current_user_id,
            OfflineQueue.status == "pending",
        ).count()
        result.append(ChatOut(
            id=chat.id,
            name=chat.name,
            is_group=chat.is_group,
            updated_at=chat.updated_at,
            unread_count=unread_message_count,
        ))

    return result

@app.post("/api/chats", response_model=ChatOut)
async def create_chat(chat: ChatCreate, authorization: str = Header(...), db: Session = Depends(get_db)):
    current_user_id = await get_current_user_id(authorization.split(" ")[1])
    
    if current_user_id not in chat.user_ids:
        chat.user_ids.append(current_user_id)
        
    user_ids = list(set(chat.user_ids))
    
    if len(user_ids) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least two users are required to create a chat.")
    
    is_group = len(user_ids) > 2

    final_chat_name = chat.name
    
    if final_chat_name is None:

        users_in_chat = await fetch_users_from_auth(user_ids)

        user_id_to_username = {u["id"]: u["username"] for u in users_in_chat}
        current_user_username = user_id_to_username.get(current_user_id, "Unknown User")

        if not is_group:

            other_user_id = next(uid for uid in user_ids if uid != current_user_id)
            other_user_username = user_id_to_username.get(other_user_id, "Someone")

            usernames_sorted = sorted([current_user_username, other_user_username])

            final_chat_name = f"{usernames_sorted[0]} and {usernames_sorted[1]}'s Vibe"
        else:
            other_usernames = sorted([u["username"] for u in users_in_chat if u["id"] != current_user_id])

            if len(other_usernames) == 0:
                final_chat_name = "Group Vibe" 
            elif len(other_usernames) == 1:
                final_chat_name = f"Vibe with {other_usernames[0]}"
            else:
                
                last_user = other_usernames[-1]
                list_users = other_usernames[:-1]
                final_chat_name = f"Group Vibe with {', '.join(list_users)} and {last_user}"

    new_chat = Chat(name=final_chat_name, is_group=is_group, updated_at=datetime.utcnow())

    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    
    for uid in user_ids:
        chat_member = ChatMember(user_id=uid, chat_id=new_chat.id)
        db.add(chat_member)
    
    db.commit()
    
    return new_chat

@app.get("/api/chats/{chat_id}/messages", response_model= List[MessageOut])
async def get_chat_messages(
    chat_id: int,
    authorization: str= Header(...),
    db: Session = Depends(get_db)
):

    try:
        token_value = authorization.split(" ")[1]
        current_user_id = await get_current_user_id(token_value)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token"
        )
    
    is_member = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == current_user_id
    ).first()

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="User is not a member of this chat or chat does not exist."
        )

    db.query(OfflineQueue).filter(
        OfflineQueue.recipient_id == current_user_id,
        OfflineQueue.status == "pending",
        OfflineQueue.message_id.in_(
            db.query(Message.id).filter(Message.chat_id == chat_id)
        ),
    ).update({"status": "delivered"}, synchronize_session=False)
    db.commit()
    
    messages = db.query(Message).filter(
        Message.chat_id == chat_id
    ).order_by(Message.timestamp.asc()).all()

    return messages

@app.post("/api/chats/{chat_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: int,
    message_data: MessageCreate, 
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    try:
        token_value = authorization.split(" ")[1]
        token_payload = await get_token_payload(token_value)
        current_user_id = token_payload["user_id"]
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    chat_member = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id == current_user_id
    ).first()

    if not chat_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this chat.")

    new_message = Message(
        chat_id=chat_id,
        sender_id=current_user_id,
        sender_username=token_payload["username"],
        content=message_data.content,
        timestamp=datetime.utcnow()
    )
    
    db.add(new_message)

    chat_to_update = db.query(Chat).filter(Chat.id == chat_id).first()
    if chat_to_update:
        chat_to_update.updated_at = datetime.utcnow()
        
    db.commit()
    db.refresh(new_message)

    other_members = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id,
        ChatMember.user_id != current_user_id,
    ).all()
    
    for member in other_members:
        db.add(OfflineQueue(
            message_id=new_message.id,
            recipient_id=member.user_id,
            status="pending",
        ))
    db.commit()

    return new_message