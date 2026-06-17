from fastapi import APIRouter, Depends, HTTPException
from schemas import SubscriberCreate, SubscriberOut
from auth import get_current_sme
from database import get_db
from supabase import Client
from uuid import UUID
from datetime import date, timedelta
from services.whatsapp import send_whatsapp

router = APIRouter(prefix="/api/subscribers", tags=["subscribers"])


@router.post("", response_model=SubscriberOut)
async def add_subscriber(body: SubscriberCreate, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    plan = db.table("subscription_plans").select("*").eq("id", str(body.plan_id)).eq("sme_id", sme["id"]).execute()
    if not plan.data:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan_data = plan.data[0]

    insert_data = {
        "sme_id": sme["id"],
        "plan_id": str(body.plan_id),
        "name": body.name,
        "phone": body.phone,
    }
    optional = {}
    for col in ("email", "whatsapp"):
        val = getattr(body, col, None) or ""
        if val:
            optional[col] = val
    insert_data.update(optional)
    try:
        sub = db.table("subscribers").insert(insert_data).execute()
    except Exception:
        for col in ("email", "whatsapp"):
            insert_data.pop(col, None)
        sub = db.table("subscribers").insert(insert_data).execute()

    subscriber = sub.data[0]
    subscriber.setdefault("whatsapp", body.whatsapp or "")
    subscriber.setdefault("email", body.email or "")

    due_date = date.today() + timedelta(days=plan_data["interval_days"])
    db.table("payment_cycles").insert({
        "subscriber_id": subscriber["id"],
        "plan_id": str(body.plan_id),
        "amount": plan_data["amount"],
        "currency": plan_data.get("currency", "XAF"),
        "due_date": due_date.isoformat(),
        "status": "pending",
    }).execute()

    welcome = (
        f"👋 *Welcome to {sme['business_name']}!*\n\n"
        f"Your subscription to *{plan_data['name']}* has been activated.\n"
        f"Your first payment of *{plan_data['amount']:,} XAF* will be due on *{due_date}*.\n\n"
        f"Thank you for choosing us!"
    )
    await send_whatsapp(body.whatsapp or body.phone, welcome, sme_id=sme["id"])

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


@router.delete("/all")
async def clear_all_subscribers(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    sub_ids = [s["id"] for s in db.table("subscribers").select("id").eq("sme_id", sme["id"]).execute().data]
    for sid in sub_ids:
        db.table("payment_cycles").delete().eq("subscriber_id", sid).execute()
        db.table("transactions").delete().eq("subscriber_id", sid).execute()
    db.table("subscribers").delete().eq("sme_id", sme["id"]).execute()
    return {"message": "All subscribers and related data cleared"}


@router.delete("/reset")
async def reset_all_sme_data(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    sme_id = sme["id"]
    tables = ["transactions", "payment_cycles", "user_preferences", "pos_sale_items", "pos_sales", "products", "subscribers", "subscription_plans"]
    for table in tables:
        try:
            db.table(table).delete().eq("sme_id", sme_id).execute()
        except Exception:
            pass
    return {"message": "All data cleared. Your account is ready for a fresh start."}


@router.delete("/{subscriber_id}")
async def delete_subscriber(subscriber_id: UUID, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    db.table("payment_cycles").delete().eq("subscriber_id", str(subscriber_id)).execute()
    db.table("transactions").delete().eq("subscriber_id", str(subscriber_id)).execute()
    result = db.table("subscribers").delete().eq("id", str(subscriber_id)).eq("sme_id", sme["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return {"message": "Subscriber deleted"}

@router.delete("/{subscriber_id}/soft")
async def deactivate_subscriber(subscriber_id: UUID, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    result = db.table("subscribers").update({"is_active": False}).eq("id", str(subscriber_id)).eq("sme_id", sme["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return {"message": "Subscriber deactivated"}
