from fastapi import APIRouter, Depends, HTTPException
from schemas import SMERegister, SMELogin, TokenOut, SMEOut
from auth import hash_password, verify_password, create_token, get_current_sme
from database import get_db
from supabase import Client

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
async def register(body: SMERegister, db: Client = Depends(get_db)):
    existing = db.table("smes").select("*").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    sme = db.table("smes").insert({
        "email": body.email,
        "password_hash": hash_password(body.password),
        "business_name": body.business_name,
        "phone": body.phone,
        "business_type": body.business_type,
    }).execute()

    if not sme.data:
        raise HTTPException(status_code=500, detail="Registration failed")

    record = sme.data[0]
    token = create_token(record["id"])
    return TokenOut(access_token=token, sme=SMEOut(**record))


@router.post("/login", response_model=TokenOut)
async def login(body: SMELogin, db: Client = Depends(get_db)):
    result = db.table("smes").select("*").eq("email", body.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    sme = result.data[0]
    if not verify_password(body.password, sme["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(sme["id"])
    return TokenOut(access_token=token, sme=SMEOut(**sme))


@router.get("/me")
async def get_me(sme: dict = Depends(get_current_sme)):
    return SMEOut(**sme)
