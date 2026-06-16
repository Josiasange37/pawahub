from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from database import get_db
from supabase import Client
from services.billing_engine import complete_payment, fail_payment

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/pawapay")
async def pawapay_webhook(request: Request, background_tasks: BackgroundTasks, db: Client = Depends(get_db)):
    body = await request.json()

    event_id = body.get("depositId") or body.get("id")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event ID")

    existing = db.table("webhook_logs").select("id").eq("pawapay_event_id", event_id).execute()
    if existing.data:
        return {"status": "duplicate"}

    db.table("webhook_logs").insert({
        "pawapay_event_id": event_id,
        "deposit_id": body.get("depositId"),
        "event_type": body.get("type", "deposit"),
        "status": body.get("status"),
        "raw_body": body,
    }).execute()

    deposit_id = body.get("depositId")
    status = body.get("status")
    if deposit_id and status:
        # Check if it's a subscription transaction
        tx = db.table("transactions").select("cycle_id").eq("pawapay_deposit_id", deposit_id).execute()
        cycle_id = tx.data[0]["cycle_id"] if tx.data else None

        if status == "COMPLETED" and cycle_id:
            background_tasks.add_task(complete_payment, cycle_id, deposit_id)
        elif status in ("FAILED", "DECLINED", "EXPIRED") and cycle_id:
            background_tasks.add_task(fail_payment, cycle_id, deposit_id, status)

        # Check if it's a POS sale
        pos_sale = db.table("pos_sales").select("id").eq("pawapay_deposit_id", deposit_id).execute()
        if pos_sale.data:
            sale_id = pos_sale.data[0]["id"]
            if status == "COMPLETED":
                db.table("pos_sales").update({"payment_status": "completed"}).eq("id", sale_id).execute()
            elif status in ("FAILED", "DECLINED", "EXPIRED"):
                db.table("pos_sales").update({"payment_status": "failed"}).eq("id", sale_id).execute()

    return {"status": "received"}


@router.get("/pawapay")
async def verify_webhook():
    return {"status": "webhook endpoint active"}
