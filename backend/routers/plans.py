from fastapi import APIRouter, Depends, HTTPException
from schemas import PlanCreate, PlanUpdate, PlanOut
from auth import get_current_sme
from database import get_db
from supabase import Client
from uuid import UUID

router = APIRouter(prefix="/api/plans", tags=["plans"])


@router.post("", response_model=PlanOut)
async def create_plan(body: PlanCreate, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    plan = db.table("subscription_plans").insert({
        "sme_id": sme["id"],
        "name": body.name,
        "description": body.description,
        "amount": body.amount,
        "interval_days": body.interval_days,
    }).execute()
    return PlanOut(**plan.data[0])


@router.get("", response_model=list[PlanOut])
async def list_plans(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    plans = db.table("subscription_plans").select("*").eq("sme_id", sme["id"]).order("created_at", desc=True).execute()
    return [PlanOut(**p) for p in plans.data]


@router.get("/{plan_id}", response_model=PlanOut)
async def get_plan(plan_id: UUID, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    plan = db.table("subscription_plans").select("*").eq("id", str(plan_id)).eq("sme_id", sme["id"]).execute()
    if not plan.data:
        raise HTTPException(status_code=404, detail="Plan not found")
    return PlanOut(**plan.data[0])


@router.put("/{plan_id}", response_model=PlanOut)
async def update_plan(plan_id: UUID, body: PlanUpdate, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    plan = db.table("subscription_plans").update(updates).eq("id", str(plan_id)).eq("sme_id", sme["id"]).execute()
    if not plan.data:
        raise HTTPException(status_code=404, detail="Plan not found")
    return PlanOut(**plan.data[0])


@router.delete("/{plan_id}")
async def delete_plan(plan_id: UUID, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    # Check for active subscribers
    subs = db.table("subscribers").select("id").eq("plan_id", str(plan_id)).eq("is_active", True).limit(1).execute()
    if subs.data:
        raise HTTPException(status_code=400, detail="Cannot delete plan with active subscribers")
    db.table("subscription_plans").update({"is_active": False}).eq("id", str(plan_id)).eq("sme_id", sme["id"]).execute()
    return {"message": "Plan deactivated"}
