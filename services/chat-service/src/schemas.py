from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserOut(BaseModel):
    id: int
    username: str
    #created_at: str 
    
    class Config:
        from_attributes = True
        
class ChatMemberOut(BaseModel):
    user_id: int
    chat_id: int

    class Config:
        from_attributes = True

class ChatOut(BaseModel):
    id: int
    name: Optional[str]
    is_group: bool
    updated_at: datetime
    unread_count: int = 0

    class Config:
        from_attributes = True
        
class ChatCreate(BaseModel):
    user_ids: List[int]
    name: Optional[str] = None

class MessageOut(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    content: str
    timestamp: datetime
    user_username: str 
    
    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str