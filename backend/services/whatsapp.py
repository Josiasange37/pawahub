from config import settings
import httpx


async def send_whatsapp(phone: str, message: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{settings.baileys_bot_url}/send",
                json={"phone": phone, "message": message},
            )
            return resp.status_code == 200
    except Exception as e:
        print(f"WhatsApp send failed: {e}")
        return False


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
