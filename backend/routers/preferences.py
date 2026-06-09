from fastapi import APIRouter, Depends, HTTPException
from schemas import PreferencesCreate, PreferencesOut
from auth import get_current_sme
from database import get_db
from supabase import Client

router = APIRouter(prefix="/api/preferences", tags=["preferences"])


@router.post("", response_model=PreferencesOut)
async def upsert_preferences(body: PreferencesCreate, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    existing = db.table("user_preferences").select("*").eq("sme_id", sme["id"]).execute()

    if existing.data:
        result = db.table("user_preferences").update({
            "business_type": body.business_type,
            "use_case": body.use_case,
            "onboarding_complete": True,
        }).eq("sme_id", sme["id"]).execute()
    else:
        result = db.table("user_preferences").insert({
            "sme_id": sme["id"],
            "business_type": body.business_type,
            "use_case": body.use_case,
            "onboarding_complete": True,
        }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save preferences")

    return PreferencesOut(**result.data[0])


@router.get("", response_model=PreferencesOut)
async def get_preferences(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    result = db.table("user_preferences").select("*").eq("sme_id", sme["id"]).execute()
    if not result.data:
        return PreferencesOut(
            id="00000000-0000-0000-0000-000000000000",
            sme_id=sme["id"],
            business_type="solo",
            use_case="subscriptions",
            onboarding_complete=False,
            created_at="2024-01-01T00:00:00Z",
        )
    return PreferencesOut(**result.data[0])
