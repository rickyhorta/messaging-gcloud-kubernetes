from fastapi import FastAPI, HTTPException, Depends, Header
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from typing import List, Optional
import os

from src.models import Base, User
from src.schemas import RegisterIn, LoginIn, UserOut
from src.auth import hash_password, verify_password, create_access_token, decode_access_token

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@chat-db:5432/chatapp")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(engine)

app = FastAPI(title="auth-service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/auth/register", response_model=UserOut)
def register(data: RegisterIn, db=Depends(get_db)):
    exists = db.query(User).filter(User.username == data.username).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(username=data.username, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(id=user.id, username=user.username, created_at=str(user.created_at))

@app.post("/api/auth/login")
def login(data: LoginIn, db=Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.id, user.username)
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/auth/users", response_model=List[UserOut])
def list_users(ids: Optional[str] = None, db=Depends(get_db)):
    query = db.query(User)
    if ids:
        try:
            id_list = [int(i) for i in ids.split(",") if i.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="ids must be comma-separated integers")
        query = query.filter(User.id.in_(id_list))
    return [UserOut(id=u.id, username=u.username, created_at=str(u.created_at)) for u in query.all()]

@app.get("/api/auth/me", response_model=UserOut)
def me(authorization: str = Header(...), db=Depends(get_db)):
    auth = authorization 
    if not auth.lower().startswith("bearer "):
        raise HTTPException(401, "Invalid authorization header")
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(404, "User not found")
    return UserOut(id=user.id, username=user.username, created_at=str(user.created_at))