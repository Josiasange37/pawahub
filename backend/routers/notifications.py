from fastapi import APIRouter, Depends
from auth import get_current_sme
from database import get_db
from supabase import Client

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    sme_id = sme["id"]

    txs = (
        db.table("transactions")
        .select("id, amount, status, created_at, subscriber_id, pawapay_status, cycle_id")
        .eq("sme_id", sme_id)
        .neq("status", "pending")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    sales = (
        db.table("pos_sales")
        .select("id, total_amount, payment_status, created_at, customer_name, receipt_number")
        .eq("sme_id", sme_id)
        .neq("payment_status", "pending")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    sub_ids = list({t["subscriber_id"] for t in txs.data if t.get("subscriber_id")})
    subs = {}
    if sub_ids:
        rows = db.table("subscribers").select("id, name").in_("id", sub_ids).execute()
        subs = {r["id"]: r["name"] for r in rows.data}

    notifications = []

    for t in txs.data:
        name = subs.get(t["subscriber_id"], "Someone")
        is_success = t["status"] == "completed"
        status_label = "✅ Completed" if is_success else "❌ Failed"
        notifications.append({
            "id": t["id"],
            "type": "payment_success" if is_success else "payment_failed",
            "title": f"{status_label} — {name}",
            "description": f"{t['amount']:,} XAF",
            "amount": t["amount"],
            "status": t["status"],
            "created_at": t["created_at"],
        })

    for s in sales.data:
        name = s.get("customer_name") or "Customer"
        is_success = s["payment_status"] == "completed"
        status_label = "✅ Sale completed" if is_success else "❌ Sale failed"
        notifications.append({
            "id": s["id"],
            "type": "pos_sale_completed" if is_success else "pos_sale_failed",
            "title": f"{status_label} — {name}",
            "description": f"{s['total_amount']:,} XAF" + (f" · #{s['receipt_number']}" if s.get("receipt_number") else ""),
            "amount": s["total_amount"],
            "status": s["payment_status"],
            "created_at": s["created_at"],
        })

    notifications.sort(key=lambda n: n["created_at"], reverse=True)

    return {
        "notifications": notifications[:20],
        "unread_count": len([n for n in notifications if _is_recent(n["created_at"])]),
    }


def _is_recent(ts: str) -> bool:
    from datetime import datetime, timezone, timedelta
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return datetime.now(timezone.utc) - dt < timedelta(hours=24)
    except Exception:
        return False
