from fastapi import APIRouter, Depends
from auth import get_current_sme
from database import get_db
from supabase import Client
from schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    subs = db.table("subscribers").select("*").eq("sme_id", sme["id"]).execute()
    total_subs = len(subs.data)
    active_subs = sum(1 for s in subs.data if s["is_active"])

    sub_ids = [s["id"] for s in subs.data]
    if sub_ids:
        txs = db.table("transactions").select("amount, status").eq("sme_id", sme["id"]).execute()
        cycles = db.table("payment_cycles").select("status").in_("subscriber_id", sub_ids).execute()
    else:
        txs = type("obj", (), {"data": []})()
        cycles = type("obj", (), {"data": []})()

    total_revenue = sum(t["amount"] for t in txs.data if t["status"] == "completed")
    pending = sum(1 for c in cycles.data if c["status"] == "pending")
    failed = sum(1 for c in cycles.data if c["status"] in ("failed", "timeout"))
    completed = sum(1 for c in cycles.data if c["status"] == "paid")
    total_cycles = pending + failed + completed
    success_rate = round((completed / total_cycles * 100) if total_cycles > 0 else 0, 1)

    return DashboardStats(
        total_subscribers=total_subs,
        active_subscribers=active_subs,
        total_revenue=total_revenue,
        monthly_revenue=total_revenue,
        pending_payments=pending,
        failed_payments=failed,
        success_rate=success_rate,
    )
