from fastapi import APIRouter, Depends, BackgroundTasks
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


@router.get("/transactions", response_model=list[TransactionOut])
async def list_transactions(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    txs = db.table("transactions").select("*").eq("sme_id", sme["id"]).order("created_at", desc=True).limit(50).execute()
    return [TransactionOut(**t) for t in txs.data]
