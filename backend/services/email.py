import asyncio
from config import settings

try:
    import resend
    resend.api_key = settings.resend_api_key
    HAS_RESEND = True
except ImportError:
    HAS_RESEND = False


async def send_email(to: str, subject: str, html: str, tag: str = "owner") -> bool:
    label = "Enterprise" if tag == "owner" else "Subscriber"
    print(f"\n{'='*50}")
    print(f"📧 EMAIL NOTIFICATION [{label}]")
    print(f"  To:      {to}")
    print(f"  Subject: {subject}")
    print(f"  Body:    {html[:300]}...")
    print(f"{'='*50}\n")

    if not HAS_RESEND or not settings.resend_api_key:
        print(f"⚠️  Resend not configured — email to {to} logged to console only")
        return True

    def _send():
        resend.Emails.send({
            "from": f"PawaSub <onboarding@resend.dev>",
            "to": [to],
            "subject": subject,
            "html": html,
        })

    try:
        await asyncio.to_thread(_send)
        print(f"✅ [{label}] Email sent to {to}")
        return True
    except Exception as e:
        print(f"❌ [{label}] Email failed: {e}")
        return False


def payment_receipt_email(business_name: str, subscriber_name: str, amount: int, plan_name: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">PawaSub Payment Receipt</h2>
        <p><strong>{business_name}</strong></p>
        <hr>
        <p><strong>Subscriber:</strong> {subscriber_name}</p>
        <p><strong>Plan:</strong> {plan_name}</p>
        <p><strong>Amount:</strong> {amount:,} XAF</p>
        <p><strong>Status:</strong> ✅ Paid</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Powered by PawaSub & pawaPay</p>
    </div>
    """


def payment_failed_email(business_name: str, subscriber_name: str, amount: int, plan_name: str, reason: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Payment Failed</h2>
        <p><strong>{business_name}</strong></p>
        <hr>
        <p><strong>Subscriber:</strong> {subscriber_name}</p>
        <p><strong>Plan:</strong> {plan_name}</p>
        <p><strong>Amount:</strong> {amount:,} XAF</p>
        <p><strong>Reason:</strong> {reason}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Powered by PawaSub & pawaPay</p>
    </div>
    """
