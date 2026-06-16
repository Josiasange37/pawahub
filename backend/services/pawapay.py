from config import settings
import httpx


PAWAPAY_PROVIDERS = {
    "237": {"MTN": "MTN_MOMO_CMR", "ORANGE": "ORANGE_CMR"},
}


def detect_provider(phone: str) -> str:
    cleaned = phone.replace("+", "").replace(" ", "")
    if cleaned.startswith("237"):
        local = cleaned[3:]
        if local.startswith("65") or local.startswith("66") or local.startswith("67") or local.startswith("68"):
            return "MTN_MOMO_CMR"
        elif local.startswith("69"):
            return "ORANGE_CMR"
    return "MTN_MOMO_CMR"


async def initiate_deposit(
    amount: int,
    phone: str,
    reference: str,
) -> dict:
    provider = detect_provider(phone)
    headers = {
        "Authorization": f"Bearer {settings.pawapay_api_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "depositId": reference,
        "amount": str(amount),
        "currency": "XAF",
        "correspondent": provider,
        "customer": {
            "phoneNumber": phone,
            "countryCode": "CMR",
        },
        "customerTimestamp": reference,
        "statementDescription": "Fluxpay subscription",
        "customerMessage": "Subscription payment",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.pawapay_base_url}/deposits",
            headers=headers,
            json=payload,
        )
        if resp.status_code in (200, 201, 202):
            data = resp.json()
            return {"success": True, "deposit_id": reference, "status": data.get("status", "ACCEPTED"), "provider": provider}
        error_detail = resp.text
        try:
            error_detail = resp.json()
        except Exception:
            pass
        return {"success": False, "error": str(error_detail), "provider": provider}


async def check_deposit_status(deposit_id: str) -> dict:
    headers = {"Authorization": f"Bearer {settings.pawapay_api_token}"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{settings.pawapay_base_url}/deposits/{deposit_id}",
            headers=headers,
        )
        if resp.status_code == 200:
            data = resp.json()
            return {"success": True, "status": data.get("status"), "data": data}
        return {"success": False, "error": resp.text}
