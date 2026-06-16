from fastapi import APIRouter, Depends, HTTPException
from schemas import SMERegister, SMELogin, TokenOut, SMEOut
from auth import hash_password, verify_password, create_token, get_current_sme
from database import get_db
from supabase import Client
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SMEUpdate(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


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


@router.put("/me")
async def update_me(body: SMEUpdate, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = db.table("smes").update(updates).eq("id", sme["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Update failed")
    return SMEOut(**result.data[0])


@router.delete("/me")
async def delete_account(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    sme_id = sme["id"]
    tables = ["transactions", "payment_cycles", "user_preferences", "pos_sale_items", "pos_sales", "products", "subscribers", "subscription_plans"]
    for table in tables:
        try:
            db.table(table).delete().eq("sme_id", sme_id).execute()
        except Exception:
            pass
    db.table("smes").delete().eq("id", sme_id).execute()
    return {"message": "Account deleted"}
