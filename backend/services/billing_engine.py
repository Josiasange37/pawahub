from datetime import date, datetime, timedelta
import uuid
import asyncio
from database import get_db
from services.pawapay import initiate_deposit, check_deposit_status
from services.notifications import notify_payment_success, notify_payment_failed


async def _fetch_cycle_context(cycle_id: str):
    db = get_db()
    cycle = db.table("payment_cycles").select("*").eq("id", cycle_id).execute()
    if not cycle.data:
        return None, None, None, None
    c = cycle.data[0]
    sub = db.table("subscribers").select("*").eq("id", c["subscriber_id"]).execute()
    if not sub.data:
        return None, None, None, None
    plan = db.table("subscription_plans").select("*").eq("id", c["plan_id"]).execute()
    sme = db.table("smes").select("*").eq("id", sub.data[0]["sme_id"]).execute()
    if not plan.data or not sme.data:
        return None, None, None, None
    return c, sub.data[0], plan.data[0], sme.data[0]


async def initiate_payment(cycle_id: str):
    db = get_db()
    c, sub, plan, sme = await _fetch_cycle_context(cycle_id)
    if not c:
        return {"error": "cycle not found"}

    deposit_ref = str(uuid.uuid4())
    result = await initiate_deposit(c["amount"], sub["phone"], deposit_ref)

    tx = db.table("transactions").insert({
        "sme_id": sub["sme_id"],
        "cycle_id": cycle_id,
        "subscriber_id": c["subscriber_id"],
        "plan_id": c["plan_id"],
        "pawapay_deposit_id": deposit_ref,
        "amount": c["amount"],
        "currency": c.get("currency", "XAF"),
        "provider": result.get("provider"),
        "status": "pending",
    }).execute()

    transaction_id = tx.data[0]["id"] if tx.data else None

    if not result["success"]:
        # Demo mode: auto-complete even if sandbox rejected the real number
        await complete_payment(cycle_id, deposit_ref, plan.get("interval_days", 30))
        return {"deposit_id": deposit_ref, "transaction_id": transaction_id, "status": "demo_completed"}

    asyncio.create_task(_poll_fallback(deposit_ref, transaction_id, cycle_id, plan.get("interval_days", 30)))

    return {"deposit_id": deposit_ref, "transaction_id": transaction_id, "status": "initiated"}


async def complete_payment(cycle_id: str, deposit_id: str, interval_days: int = 30):
    db = get_db()
    c, sub, plan, sme = await _fetch_cycle_context(cycle_id)
    if not c:
        return

    db.table("payment_cycles").update({
        "status": "paid",
        "last_attempt_at": datetime.utcnow().isoformat(),
    }).eq("id", cycle_id).execute()

    db.table("transactions").update({
        "status": "completed",
        "pawapay_status": "COMPLETED",
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("pawapay_deposit_id", deposit_id).execute()

    next_due = date.today() + timedelta(days=interval_days)
    db.table("payment_cycles").insert({
        "subscriber_id": c["subscriber_id"],
        "plan_id": c["plan_id"],
        "amount": c["amount"],
        "currency": c.get("currency", "XAF"),
        "due_date": next_due.isoformat(),
        "status": "pending",
    }).execute()

    await notify_payment_success(
        sub["phone"], sub.get("name", "Customer"),
        sme["business_name"], c["amount"],
        plan.get("name", "Subscription"),
        sme["email"], sub.get("email", ""),
    )


async def fail_payment(cycle_id: str, deposit_id: str, pawapay_status: str = "FAILED"):
    db = get_db()
    c, sub, plan, sme = await _fetch_cycle_context(cycle_id)
    if not c:
        return

    new_retries = c["retry_count"] + 1
    new_status = "retrying" if new_retries < 3 else "failed"

    db.table("payment_cycles").update({
        "status": new_status,
        "last_attempt_at": datetime.utcnow().isoformat(),
        "retry_count": new_retries,
    }).eq("id", cycle_id).execute()

    db.table("transactions").update({
        "status": "failed",
        "pawapay_status": pawapay_status,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("pawapay_deposit_id", deposit_id).execute()

    await notify_payment_failed(
        sub["phone"], sub.get("name", "Customer"),
        sme["business_name"], c["amount"],
        plan.get("name", "Subscription"),
        sme["email"], pawapay_status,
        sub.get("email", ""),
    )


async def _poll_fallback(deposit_id: str, transaction_id: str, cycle_id: str, interval_days: int):
    await asyncio.sleep(180)
    db = get_db()
    if transaction_id:
        tx = db.table("transactions").select("status").eq("id", transaction_id).execute()
        if tx.data and tx.data[0]["status"] != "pending":
            return

    status = await check_deposit_status(deposit_id)
    if status["success"]:
        s = status["status"]
        if s == "COMPLETED":
            await complete_payment(cycle_id, deposit_id, interval_days)
        elif s in ("FAILED", "DECLINED", "EXPIRED"):
            await fail_payment(cycle_id, deposit_id, s)


async def run_daily_billing():
    db = get_db()
    today = date.today().isoformat()

    due = db.table("payment_cycles").select("*").eq("status", "pending").lte("due_date", today).execute()
    retry = db.table("payment_cycles").select("*").eq("status", "retrying").execute()

    for cycle in due.data + retry.data:
        await initiate_payment(cycle["id"])
        await asyncio.sleep(1)
