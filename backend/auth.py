from datetime import datetime, timedelta
from uuid import uuid4

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import get_db
from supabase import Client

security = HTTPBearer()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(sme_id: str) -> str:
    payload = {
        "sub": sme_id,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "jti": str(uuid4()),
    }
    from config import settings
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def get_current_sme(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_db),
) -> dict:
    token = credentials.credentials
    try:
        from config import settings
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        sme_id = payload.get("sub")
        if sme_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = db.table("smes").select("*").eq("id", sme_id).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="SME not found")
    return result.data[0]


def get_sme_from_token(token: str, db: Client) -> dict:
    try:
        from config import settings
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        sme_id = payload.get("sub")
        if sme_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = db.table("smes").select("*").eq("id", sme_id).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="SME not found")
    return result.data[0]
