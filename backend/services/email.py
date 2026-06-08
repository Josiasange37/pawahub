import resend
from config import settings

resend.api_key = settings.resend_api_key


RESEND_OWNER = "aaron.akana@facsciences-uy1.cm"


async def send_email(to: str, subject: str, html: str) -> bool:
    print(f"\n{'='*50}")
    print(f"📧 EMAIL NOTIFICATION")
    print(f"  To:      {to}")
    print(f"  Subject: {subject}")
    print(f"  Body:    {html[:300]}...")
    print(f"{'='*50}\n")
    try:
        params = {
            "from": "PawaSub <onboarding@resend.dev>",
            "to": [RESEND_OWNER],
            "subject": f"[PawaSub Demo] {subject}",
            "html": f"<p><strong>Original recipient:</strong> {to}</p><hr>{html}",
        }
        r = resend.Emails.send(params)
        print(f"✅ Email forwarded to {RESEND_OWNER}: {r}")
        return True
    except Exception as e:
        print(f"❌ Email failed: {e}")
        return True


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
