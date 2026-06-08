from datetime import date, datetime, timedelta
import uuid
from database import get_db
from services.pawapay import initiate_deposit, check_deposit_status
from services.notifications import notify_payment_reminder, notify_payment_success, notify_payment_failed
import asyncio


async def process_payment_cycle(cycle_id: str):
    db = get_db()
    cycle = db.table("payment_cycles").select("*, subscribers!inner(*, sme_id, plans:plan_id(*), sme:subscribers!sme_id(*))").eq("id", cycle_id).execute()
    if not cycle.data:
        print(f"Cycle {cycle_id} not found")
        return

    c = cycle.data[0]
    subscriber = db.table("subscribers").select("*, plans(*), sme:subscribers!inner(sme_id)").eq("id", c["subscriber_id"]).execute()
    if not subscriber.data:
        return

    sub = subscriber.data[0]
    plan = sub.get("plans", {})
    sme = db.table("smes").select("*").eq("id", sub["sme_id"]).execute()
    if not sme.data:
        return
    sme_data = sme.data[0]

    deposit_ref = str(uuid.uuid4())
    result = await initiate_deposit(c["amount"], sub["phone"], deposit_ref)

    db.table("transactions").insert({
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

    if not result["success"]:
        db.table("payment_cycles").update({
            "status": "failed",
            "last_attempt_at": datetime.utcnow().isoformat(),
            "retry_count": c["retry_count"] + 1,
        }).eq("id", cycle_id).execute()
        await notify_payment_failed(
            sub["phone"], sub.get("name", "Customer"),
            sme_data["business_name"], c["amount"],
            plan.get("name", "Subscription"),
            sme_data["email"], str(result.get("error", "API error")),
        )
        return

    for attempt in range(12):
        await asyncio.sleep(10)
        status = await check_deposit_status(deposit_ref)
        if status["success"]:
            s = status["status"]
            if s == "COMPLETED":
                db.table("payment_cycles").update({
                    "status": "paid",
                    "last_attempt_at": datetime.utcnow().isoformat(),
                }).eq("id", cycle_id).execute()
                db.table("transactions").update({
                    "status": "completed",
                    "pawapay_status": "COMPLETED",
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("pawapay_deposit_id", deposit_ref).execute()
                next_due = date.today() + timedelta(days=plan.get("interval_days", 30))
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
                    sme_data["business_name"], c["amount"],
                    plan.get("name", "Subscription"),
                    sme_data["email"],
                )
                return
            elif s in ("FAILED", "DECLINED", "EXPIRED"):
                new_retries = c["retry_count"] + 1
                if new_retries >= 3:
                    new_status = "failed"
                else:
                    new_status = "retrying"
                db.table("payment_cycles").update({
                    "status": new_status,
                    "last_attempt_at": datetime.utcnow().isoformat(),
                    "retry_count": new_retries,
                }).eq("id", cycle_id).execute()
                db.table("transactions").update({
                    "status": "failed",
                    "pawapay_status": s,
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("pawapay_deposit_id", deposit_ref).execute()
                await notify_payment_failed(
                    sub["phone"], sub.get("name", "Customer"),
                    sme_data["business_name"], c["amount"],
                    plan.get("name", "Subscription"),
                    sme_data["email"],
                )
                return

    db.table("payment_cycles").update({
        "status": "timeout",
        "last_attempt_at": datetime.utcnow().isoformat(),
    }).eq("id", cycle_id).execute()
    db.table("transactions").update({
        "status": "timeout",
        "pawapay_status": "TIMEOUT",
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("pawapay_deposit_id", deposit_ref).execute()


async def run_daily_billing():
    db = get_db()
    today = date.today().isoformat()
    due_cycles = db.table("payment_cycles")\
        .select("*")\
        .eq("status", "pending")\
        .lte("due_date", today)\
        .execute()

    retry_cycles = db.table("payment_cycles")\
        .select("*")\
        .eq("status", "retrying")\
        .execute()

    cycles = due_cycles.data + retry_cycles.data
    for cycle in cycles:
        await process_payment_cycle(cycle["id"])
        await asyncio.sleep(5)
