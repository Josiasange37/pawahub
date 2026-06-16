import logging
from fastapi import APIRouter, Depends, HTTPException
from schemas import PreferencesCreate, PreferencesOut
from auth import get_current_sme
from database import get_db
from supabase import Client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/preferences", tags=["preferences"])


def _default_preferences(sme: dict) -> PreferencesOut:
    return PreferencesOut(
        id="00000000-0000-0000-0000-000000000000",
        sme_id=sme["id"],
        business_type=sme.get("business_type", "solo"),
        use_case="subscriptions",
        onboarding_complete=False,
        created_at="2024-01-01T00:00:00Z",
    )


@router.post("", response_model=PreferencesOut)
async def upsert_preferences(body: PreferencesCreate, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    try:
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

        # Sync business_type to smes table
        db.table("smes").update({"business_type": body.business_type}).eq("id", sme["id"]).execute()

        return PreferencesOut(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"user_preferences table error: {e}")
        return _default_preferences(sme)


@router.get("", response_model=PreferencesOut)
async def get_preferences(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    try:
        result = db.table("user_preferences").select("*").eq("sme_id", sme["id"]).execute()
        if not result.data:
            return _default_preferences(sme)
        return PreferencesOut(**result.data[0])
    except Exception as e:
        logger.warning(f"user_preferences table error: {e}")
        return _default_preferences(sme)
