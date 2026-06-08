from fastapi import APIRouter, Request, HTTPException, Depends
from database import get_db
from supabase import Client

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/pawapay")
async def pawapay_webhook(request: Request, db: Client = Depends(get_db)):
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
        up = {"updated_at": "now()"}
        if status == "COMPLETED":
            up["status"] = "completed"
            up["pawapay_status"] = "COMPLETED"
            db.table("transactions").update(up).eq("pawapay_deposit_id", deposit_id).execute()
            tx = db.table("transactions").select("cycle_id").eq("pawapay_deposit_id", deposit_id).execute()
            if tx.data and tx.data[0].get("cycle_id"):
                db.table("payment_cycles").update({"status": "paid"}).eq("id", tx.data[0]["cycle_id"]).execute()
        elif status in ("FAILED", "DECLINED", "EXPIRED"):
            up["status"] = "failed"
            up["pawapay_status"] = status
            db.table("transactions").update(up).eq("pawapay_deposit_id", deposit_id).execute()

    return {"status": "received"}


@router.get("/pawapay")
async def verify_webhook():
    return {"status": "webhook endpoint active"}
