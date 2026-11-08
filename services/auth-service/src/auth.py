import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import HTTPException
from passlib.context import CryptContext
import jwt


# ----- Load environment -----
load_dotenv()
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set")
JWT_ALG = "HS256"
JWT_EXP_HOURS = 24

# ----- Password hashing -----
PWD_CTX = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    return PWD_CTX.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return PWD_CTX.verify(password, hashed)

# ----- JWT helpers -----
def create_access_token(user_id: int, username: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXP_HOURS)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

    if isinstance(token, bytes):
        token = token.decode("utf-8")

    return token

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        print(e)
        raise HTTPException(status_code=401, detail="Invalid token")
