from fastapi import APIRouter, Depends, HTTPException
from schemas import SubscriberCreate, SubscriberOut
from auth import get_current_sme
from database import get_db
from supabase import Client
from uuid import UUID
from datetime import date, timedelta

router = APIRouter(prefix="/api/subscribers", tags=["subscribers"])


@router.post("", response_model=SubscriberOut)
async def add_subscriber(body: SubscriberCreate, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    plan = db.table("subscription_plans").select("*").eq("id", str(body.plan_id)).eq("sme_id", sme["id"]).execute()
    if not plan.data:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan_data = plan.data[0]

    sub = db.table("subscribers").insert({
        "sme_id": sme["id"],
        "plan_id": str(body.plan_id),
        "name": body.name,
        "phone": body.phone,
        "email": body.email,
    }).execute()

    subscriber = sub.data[0]

    due_date = date.today() + timedelta(days=plan_data["interval_days"])
    db.table("payment_cycles").insert({
        "subscriber_id": subscriber["id"],
        "plan_id": str(body.plan_id),
        "amount": plan_data["amount"],
        "currency": plan_data.get("currency", "XAF"),
        "due_date": due_date.isoformat(),
        "status": "pending",
    }).execute()

    return SubscriberOut(**subscriber)


@router.get("", response_model=list[SubscriberOut])
async def list_subscribers(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    subs = db.table("subscribers").select("*").eq("sme_id", sme["id"]).order("created_at", desc=True).execute()
    return [SubscriberOut(**s) for s in subs.data]


@router.get("/{subscriber_id}", response_model=SubscriberOut)
async def get_subscriber(subscriber_id: UUID, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    sub = db.table("subscribers").select("*").eq("id", str(subscriber_id)).eq("sme_id", sme["id"]).execute()
    if not sub.data:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return SubscriberOut(**sub.data[0])


@router.delete("/{subscriber_id}")
async def deactivate_subscriber(subscriber_id: UUID, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    result = db.table("subscribers").update({"is_active": False}).eq("id", str(subscriber_id)).eq("sme_id", sme["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return {"message": "Subscriber deactivated"}
