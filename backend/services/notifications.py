from services.whatsapp import (
    send_whatsapp,
    payment_reminder_msg,
    payment_receipt_msg,
    payment_failed_msg,
)
from services.email import (
    send_email,
    payment_receipt_email,
    payment_failed_email,
)


async def notify_payment_reminder(
    subscriber_phone: str,
    business_name: str,
    amount: int,
    due_date: str,
    sme_id: str = "",
):
    msg = payment_reminder_msg(business_name, amount, due_date)
    await send_whatsapp(subscriber_phone, msg, sme_id=sme_id)


async def notify_payment_success(
    subscriber_phone: str,
    subscriber_name: str,
    business_name: str,
    amount: int,
    plan_name: str,
    owner_email: str,
    subscriber_email: str = "",
    sme_id: str = "",
):
    w_msg = payment_receipt_msg(business_name, amount, plan_name)
    await send_whatsapp(subscriber_phone, w_msg, sme_id=sme_id)

    receipt_html = payment_receipt_email(business_name, subscriber_name, amount, plan_name)
    await send_email(owner_email, f"Payment Received – {subscriber_name}", receipt_html)

    if subscriber_email:
        await send_email(subscriber_email, f"Receipt – {plan_name}", receipt_html, tag="subscriber")


async def notify_payment_failed(
    subscriber_phone: str,
    subscriber_name: str,
    business_name: str,
    amount: int,
    plan_name: str,
    owner_email: str,
    reason: str = "Insufficient balance",
    subscriber_email: str = "",
    sme_id: str = "",
):
    w_msg = payment_failed_msg(business_name, amount, plan_name)
    await send_whatsapp(subscriber_phone, w_msg, sme_id=sme_id)

    failed_html = payment_failed_email(business_name, subscriber_name, amount, plan_name, reason)
    await send_email(owner_email, f"Payment Failed – {subscriber_name}", failed_html)

    if subscriber_email:
        await send_email(subscriber_email, f"Payment Failed – {plan_name}", failed_html, tag="subscriber")
