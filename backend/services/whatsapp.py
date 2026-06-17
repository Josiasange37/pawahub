import asyncio
import httpx
from config import settings


async def send_whatsapp(phone: str, message: str, sme_id: str = "") -> bool:
    print(f"\n{'='*50}")
    print(f" WhatsApp NOTIFICATION")
    print(f"  To:      {phone}")
    print(f"  SME:     {sme_id}")
    print(f"  Message: {message}")
    print(f"{'='*50}\n")

    last_err = None
    for attempt in range(1, 4):
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{settings.baileys_bot_url}/send",
                    json={"phone": phone, "message": message, "sme_id": sme_id},
                )
                if resp.status_code == 200:
                    return True
                print(f"  Attempt {attempt}: bot returned HTTP {resp.status_code}")
                last_err = f"HTTP {resp.status_code}"
        except httpx.TimeoutException:
            print(f"  Attempt {attempt}: timeout (Railway cold start?)")
            last_err = "timeout"
        except Exception as e:
            print(f"  Attempt {attempt}: {e}")
            last_err = str(e)

        if attempt < 3:
            wait = 2 ** attempt
            print(f"  Retrying in {wait}s...")
            await asyncio.sleep(wait)

    print(f" WhatsApp failed after 3 attempts: {last_err}")
    return False


async def warm_bot():
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{settings.baileys_bot_url}/status")
            if resp.status_code == 200:
                print("  Bot keep-warm: OK")
            else:
                print(f"  Bot keep-warm: HTTP {resp.status_code}")
    except Exception as e:
        print(f"  Bot keep-warm: {e}")


def payment_reminder_msg(business_name: str, amount: int, due_date: str) -> str:
    return (
        f"🔔 *Payment Reminder*\n\n"
        f"Hi! This is a reminder from *{business_name}*.\n\n"
        f"Your subscription payment of *{amount:,} XAF* is due on *{due_date}*.\n\n"
        f"You will receive a payment request shortly. No action needed if you have sufficient balance.\n\n"
        f"Thank you for your continued support!"
    )


def payment_receipt_msg(business_name: str, amount: int, plan_name: str) -> str:
    return (
        f"✅ *Payment Successful*\n\n"
        f"Your *{plan_name}* subscription payment of *{amount:,} XAF* to *{business_name}* has been received.\n\n"
        f"Thank you!"
    )


def payment_failed_msg(business_name: str, amount: int, plan_name: str) -> str:
    return (
        f"❌ *Payment Failed*\n\n"
        f"Your *{plan_name}* subscription payment of *{amount:,} XAF* to *{business_name}* could not be processed.\n\n"
        f"We will retry automatically. Please ensure you have sufficient balance.\n\n"
        f"Contact *{business_name}* for assistance."
    )
