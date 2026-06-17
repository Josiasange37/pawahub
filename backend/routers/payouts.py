import uuid
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from schemas import PayoutCreate, PayoutOut, PayoutBalance
from auth import get_current_sme
from database import get_db
from supabase import Client
from services.pawapay import initiate_payout, check_payout_status, detect_provider

router = APIRouter(prefix="/api/payouts", tags=["payouts"])


@router.get("/balance", response_model=PayoutBalance)
async def get_balance(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    sme_id = sme["id"]

    total_collected = 0

    try:
        pos = db.table("pos_sales").select("total_amount").eq("sme_id", sme_id).eq("payment_status", "completed").execute()
        total_collected += sum(s["total_amount"] for s in pos.data)
    except Exception:
        pass

    try:
        txs = db.table("transactions").select("amount").eq("sme_id", sme_id).eq("status", "completed").execute()
        total_collected += sum(t["amount"] for t in txs.data)
    except Exception:
        pass

    try:
        payouts_result = db.table("payouts").select("amount,status").eq("sme_id", sme_id).execute()
        payout_rows = payouts_result.data if payouts_result.data else []
    except Exception:
        payout_rows = []

    total_withdrawn = sum(p["amount"] for p in payout_rows if p["status"] == "completed")
    pending_withdrawals = sum(p["amount"] for p in payout_rows if p["status"] in ("pending", "processing"))

    available_balance = total_collected - total_withdrawn - pending_withdrawals

    return PayoutBalance(
        available_balance=available_balance,
        total_collected=total_collected,
        total_withdrawn=total_withdrawn,
        pending_withdrawals=pending_withdrawals,
    )


@router.post("/withdraw", response_model=PayoutOut)
async def withdraw(body: PayoutCreate, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    sme_id = sme["id"]

    if body.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is 100 XAF")

    balance_resp = await get_balance(sme, db)
    if body.amount > balance_resp.available_balance:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: {balance_resp.available_balance} XAF")

    payout_ref = str(uuid.uuid4())
    provider = detect_provider(body.phone)

    result = await initiate_payout(amount=body.amount, phone=body.phone, reference=payout_ref)
    if not result["success"]:
        raise HTTPException(status_code=502, detail=f"Payout failed: {result.get('error', 'unknown')}")

    record = {
        "sme_id": sme_id,
        "pawapay_payout_id": payout_ref,
        "amount": body.amount,
        "currency": "XAF",
        "recipient_phone": body.phone,
        "recipient_provider": provider,
        "status": "processing",
        "pawapay_status": result.get("status", "ACCEPTED"),
    }

    inserted = db.table("payouts").insert(record).execute()
    if not inserted.data:
        raise HTTPException(status_code=500, detail="Failed to save payout record")

    payout = inserted.data[0]
    asyncio.create_task(_poll_payout_fallback(payout["id"], payout_ref, sme_id))

    return PayoutOut(**payout)


@router.get("", response_model=list[PayoutOut])
async def list_payouts(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    try:
        result = db.table("payouts").select("*").eq("sme_id", sme["id"]).order("created_at", desc=True).execute()
        return [PayoutOut(**r) for r in (result.data or [])]
    except Exception:
        return []


async def _poll_payout_fallback(local_id: str, payout_ref: str, sme_id: str):
    db = get_db()
    for attempt in range(12):
        await asyncio.sleep(30)
        try:
            existing = db.table("payouts").select("status").eq("id", local_id).execute()
            if existing.data and existing.data[0]["status"] not in ("pending", "processing"):
                return
            status = await check_payout_status(payout_ref)
            if status["success"]:
                s = status["status"]
                if s == "COMPLETED":
                    db.table("payouts").update({"status": "completed", "pawapay_status": s}).eq("id", local_id).execute()
                    return
                elif s in ("FAILED", "DECLINED", "EXPIRED"):
                    db.table("payouts").update({
                        "status": "failed", "pawapay_status": s,
                        "error_message": f"pawaPay: {s}",
                    }).eq("id", local_id).execute()
                    return
        except Exception:
            pass

    db.table("payouts").update({
        "status": "failed", "pawapay_status": "TIMEOUT",
        "error_message": "pawaPay did not respond within the timeout period",
    }).eq("id", local_id).execute()
