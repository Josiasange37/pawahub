from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from auth import get_current_sme
from database import get_db
from supabase import Client
from schemas import PaymentCycleOut, TransactionOut
from services.billing_engine import initiate_payment
from uuid import UUID
from datetime import date

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.get("/cycles", response_model=list[PaymentCycleOut])
async def list_cycles(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    subs = db.table("subscribers").select("id").eq("sme_id", sme["id"]).execute()
    sub_ids = [s["id"] for s in subs.data]
    if not sub_ids:
        return []
    cycles = db.table("payment_cycles").select("*").in_("subscriber_id", sub_ids).order("due_date", desc=True).execute()
    return [PaymentCycleOut(**c) for c in cycles.data]


@router.post("/trigger")
async def trigger_billing(background_tasks: BackgroundTasks, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    today = date.today().isoformat()
    subs = db.table("subscribers").select("id").eq("sme_id", sme["id"]).execute()
    sub_ids = [s["id"] for s in subs.data]
    if not sub_ids:
        return {"message": "No subscribers found"}

    due = db.table("payment_cycles").select("*").in_("subscriber_id", sub_ids).eq("status", "pending").lte("due_date", today).execute()
    retry = db.table("payment_cycles").select("*").in_("subscriber_id", sub_ids).eq("status", "retrying").execute()
    all_cycles = due.data + retry.data

    for cycle in all_cycles:
        background_tasks.add_task(initiate_payment, cycle["id"])

    return {
        "message": f"Processing {len(all_cycles)} payments in background",
        "count": len(all_cycles),
        "status": "processing",
    }


@router.post("/charge/{subscriber_id}")
async def charge_subscriber(subscriber_id: UUID, background_tasks: BackgroundTasks, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    sub = db.table("subscribers").select("*, plans(*)").eq("id", str(subscriber_id)).eq("sme_id", sme["id"]).execute()
    if not sub.data:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    sub_data = sub.data[0]
    plan = sub_data.get("plans", {})
    if not plan:
        raise HTTPException(status_code=400, detail="Subscriber has no plan")

    today = date.today().isoformat()
    cycle = db.table("payment_cycles").insert({
        "subscriber_id": str(subscriber_id),
        "plan_id": plan["id"],
        "amount": plan["amount"],
        "currency": plan.get("currency", "XAF"),
        "due_date": today,
        "status": "pending",
    }).execute()

    cycle_id = cycle.data[0]["id"]
    background_tasks.add_task(initiate_payment, cycle_id)

    return {"message": "Payment initiated", "cycle_id": cycle_id, "amount": plan["amount"]}


@router.get("/transactions", response_model=list[TransactionOut])
async def list_transactions(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    txs = db.table("transactions").select("*").eq("sme_id", sme["id"]).order("created_at", desc=True).limit(50).execute()
    return [TransactionOut(**t) for t in txs.data]
