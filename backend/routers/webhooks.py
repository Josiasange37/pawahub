from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from database import get_db
from supabase import Client
from services.billing_engine import complete_payment, fail_payment
from services.whatsapp import send_whatsapp

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
        pos_sale = db.table("pos_sales").select("id, customer_phone, amount, customer_name, sme_id").eq("pawapay_deposit_id", deposit_id).execute()
        if pos_sale.data:
            sale = pos_sale.data[0]
            sale_id = sale["id"]
            amount = sale.get("amount", 0)
            phone = sale.get("customer_phone")
            name = sale.get("customer_name", "Customer")
            sme_id = sale.get("sme_id")
            if status == "COMPLETED":
                db.table("pos_sales").update({"payment_status": "completed"}).eq("id", sale_id).execute()
                from routers.pos import _deduct_stock
                _deduct_stock(sale_id)
                if phone:
                    msg = (
                        f"✅ *Payment Successful!*\n\n"
                        f"Hi {name},\n"
                        f"Your payment of *{amount:,} XAF* has been received successfully.\n\n"
                        f"Thank you for your purchase!"
                    )
                    await send_whatsapp(phone, msg, sme_id=sme_id)
            elif status in ("FAILED", "DECLINED", "EXPIRED"):
                db.table("pos_sales").update({"payment_status": "failed"}).eq("id", sale_id).execute()
                if phone:
                    msg = (
                        f"❌ *Payment Failed*\n\n"
                        f"Hi {name},\n"
                        f"Your payment of *{amount:,} XAF* could not be processed.\n"
                        f"Please try again or use a different payment method."
                    )
                    await send_whatsapp(phone, msg, sme_id=sme_id)

        # Check if it's a payout
        payout_id = body.get("payoutId") or deposit_id
        payout = db.table("payouts").select("id, sme_id, recipient_phone, amount").eq("pawapay_payout_id", payout_id).execute()
        if payout.data:
            p = payout.data[0]
            if status == "COMPLETED":
                db.table("payouts").update({"status": "completed", "pawapay_status": status}).eq("id", p["id"]).execute()
                phone = p.get("recipient_phone")
                if phone:
                    msg = (
                        f"✅ *Withdrawal Successful!*\n\n"
                        f"Your withdrawal of *{p['amount']:,} XAF* has been sent to your mobile money account.\n"
                        f"Thank you for using Fluxpay!"
                    )
                    await send_whatsapp(phone, msg, sme_id=p["sme_id"])
            elif status in ("FAILED", "DECLINED", "EXPIRED"):
                db.table("payouts").update({
                    "status": "failed", "pawapay_status": status,
                    "error_message": f"pawaPay: {status}",
                }).eq("id", p["id"]).execute()
                phone = p.get("recipient_phone")
                if phone:
                    msg = (
                        f"❌ *Withdrawal Failed*\n\n"
                        f"Your withdrawal of *{p['amount']:,} XAF* could not be processed.\n"
                        f"Please check your mobile money account and try again."
                    )
                    await send_whatsapp(phone, msg, sme_id=p["sme_id"])

    return {"status": "received"}


@router.get("/pawapay")
async def verify_webhook():
    return {"status": "webhook endpoint active"}
