import resend
from config import settings

resend.api_key = settings.resend_api_key


async def send_email(to: str, subject: str, html: str) -> bool:
    try:
        params = {
            "from": "PawaSub <noreply@pawasub.app>",
            "to": [to],
            "subject": subject,
            "html": html,
        }
        r = resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
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
