import uuid
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from services.pawapay import check_deposit_status
from fastapi.responses import FileResponse
from schemas import SaleCreate, SaleOut, SaleItemOut
from auth import get_current_sme
from database import get_db
from supabase import Client

router = APIRouter(prefix="/api/pos", tags=["pos"])


def generate_receipt_number():
    return f"PS-{uuid.uuid4().hex[:8].upper()}"


@router.get("/products")
async def list_active_products(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    try:
        result = db.table("products").select("*").eq("sme_id", sme["id"]).eq("is_active", True).order("name").execute()
        return result.data
    except Exception:
        return []


@router.post("/sales", response_model=SaleOut)
async def create_sale(body: SaleCreate, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    if not body.items:
        raise HTTPException(status_code=400, detail="No items in sale")

    try:
        # Fetch products and calculate totals
        product_ids = [str(item.product_id) for item in body.items]
        products_result = db.table("products").select("*").in_("id", product_ids).eq("sme_id", sme["id"]).execute()
        products_map = {p["id"]: p for p in products_result.data}
    except Exception:
        raise HTTPException(status_code=503, detail="Database setup required. Run migration first.")

    if len(products_map) != len(product_ids):
        raise HTTPException(status_code=400, detail="One or more products not found")

    # Validate stock
    for item in body.items:
        product = products_map[str(item.product_id)]
        current_stock = product.get("stock", 0)
        if current_stock is None:
            current_stock = 0
        if item.quantity > current_stock:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product['name']}': requested {item.quantity}, available {current_stock}"
            )

    total_amount = 0
    sale_items = []
    for item in body.items:
        product = products_map[str(item.product_id)]
        unit_price = item.price if item.price is not None else product["price"]
        subtotal = unit_price * item.quantity
        total_amount += subtotal
        sale_items.append({
            "product_id": str(item.product_id),
            "product_name": product["name"],
            "quantity": item.quantity,
            "unit_price": unit_price,
            "subtotal": subtotal,
        })

    receipt_number = generate_receipt_number()

    try:
        # Create the sale
        sale_result = db.table("pos_sales").insert({
            "sme_id": sme["id"],
            "customer_name": body.customer_name,
            "customer_phone": body.customer_phone,
            "total_amount": total_amount,
            "payment_method": body.payment_method,
            "payment_status": "pending",
            "receipt_number": receipt_number,
        }).execute()
    except Exception:
        raise HTTPException(status_code=503, detail="Database setup required. Run migration first.")

    if not sale_result.data:
        raise HTTPException(status_code=500, detail="Failed to create sale")

    sale = sale_result.data[0]

    # Create sale items
    for item in sale_items:
        item["sale_id"] = sale["id"]
    try:
        items_result = db.table("pos_sale_items").insert(sale_items).execute()
        db_items = items_result.data if items_result.data else []
    except Exception:
        db_items = []

    if not db_items:
        for i, item in enumerate(sale_items):
            item["id"] = f"00000000-0000-0000-0000-{i:012d}"
        db_items = sale_items

    return SaleOut(
        id=sale["id"],
        sme_id=sale["sme_id"],
        customer_name=sale["customer_name"],
        customer_phone=sale["customer_phone"],
        total_amount=sale["total_amount"],
        currency=sale["currency"],
        payment_method=sale["payment_method"],
        payment_status=sale["payment_status"],
        receipt_number=sale["receipt_number"],
        created_at=sale["created_at"],
        items=[SaleItemOut(**i) for i in db_items],
    )


@router.post("/sales/{sale_id}/charge")
async def charge_sale(sale_id: str, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    try:
        sale_result = db.table("pos_sales").select("*").eq("id", sale_id).eq("sme_id", sme["id"]).execute()
    except Exception:
        raise HTTPException(status_code=503, detail="Database setup required. Run migration first.")
    if not sale_result.data:
        raise HTTPException(status_code=404, detail="Sale not found")

    sale = sale_result.data[0]

    # Generate a reference UUID
    deposit_ref = str(uuid.uuid4())

    # Initiate payment via pawaPay
    from services.pawapay import initiate_deposit
    try:
        deposit = await initiate_deposit(
            amount=sale["total_amount"],
            phone=sale["customer_phone"],
            reference=deposit_ref,
        )
        if not deposit.get("success", False):
            db.table("pos_sales").update({
                "payment_status": "failed",
                "pawapay_deposit_id": deposit_ref,
            }).eq("id", sale_id).execute()
            raise HTTPException(status_code=502, detail=f"Payment provider error: {deposit.get('error', 'unknown')}")

        db.table("pos_sales").update({
            "payment_status": "processing",
            "pawapay_deposit_id": deposit_ref,
        }).eq("id", sale_id).execute()

        asyncio.create_task(_poll_pos_fallback(sale_id, deposit_ref))

        return {"message": "Payment initiated", "deposit_id": deposit_ref, "status": "processing"}
    except Exception as e:
        db.table("pos_sales").update({
            "payment_status": "failed",
        }).eq("id", sale_id).execute()
        raise HTTPException(status_code=500, detail=f"Payment failed: {str(e)}")


def _deduct_stock(sale_id: str):
    db = get_db()
    items = db.table("pos_sale_items").select("product_id, quantity").eq("sale_id", sale_id).execute()
    for item in items.data or []:
        product = db.table("products").select("stock").eq("id", item["product_id"]).execute()
        if product.data:
            current = product.data[0].get("stock") or 0
            new_stock = max(0, current - item["quantity"])
            db.table("products").update({"stock": new_stock}).eq("id", item["product_id"]).execute()


async def _poll_pos_fallback(sale_id: str, deposit_id: str):
    for attempt in range(12):
        await asyncio.sleep(30)
        db = get_db()
        sale = db.table("pos_sales").select("payment_status").eq("id", sale_id).execute()
        if sale.data and sale.data[0]["payment_status"] not in ("pending", "processing"):
            return
        status = await check_deposit_status(deposit_id)
        if status["success"]:
            s = status["status"]
            if s == "COMPLETED":
                db.table("pos_sales").update({"payment_status": "completed"}).eq("id", sale_id).execute()
                _deduct_stock(sale_id)
                return
            elif s in ("FAILED", "DECLINED", "EXPIRED"):
                db.table("pos_sales").update({"payment_status": "failed"}).eq("id", sale_id).execute()
                return

    db.table("pos_sales").update({"payment_status": "failed", "pawapay_deposit_id": deposit_id}).eq("id", sale_id).execute()


@router.get("/sales", response_model=list[SaleOut])
async def list_sales(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    try:
        sales_result = db.table("pos_sales").select("*").eq("sme_id", sme["id"]).order("created_at", desc=True).execute()
    except Exception:
        return []

    sales = []
    for sale in sales_result.data:
        try:
            items_result = db.table("pos_sale_items").select("*").eq("sale_id", sale["id"]).execute()
        except Exception:
            items_result.data = []
        sales.append(SaleOut(
            id=sale["id"],
            sme_id=sale["sme_id"],
            customer_name=sale["customer_name"],
            customer_phone=sale["customer_phone"],
            total_amount=sale["total_amount"],
            currency=sale["currency"],
            payment_method=sale["payment_method"],
            payment_status=sale["payment_status"],
            receipt_number=sale["receipt_number"],
            created_at=sale["created_at"],
            items=[SaleItemOut(**i) for i in items_result.data],
        ))

    return sales


@router.get("/sales/{sale_id}/receipt")
async def get_receipt(sale_id: str, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    sale_result = db.table("pos_sales").select("*").eq("id", sale_id).eq("sme_id", sme["id"]).execute()
    if not sale_result.data:
        raise HTTPException(status_code=404, detail="Sale not found")

    sale = sale_result.data[0]
    items_result = db.table("pos_sale_items").select("*").eq("sale_id", sale_id).execute()

    return {
        "sale": SaleOut(
            id=sale["id"],
            sme_id=sale["sme_id"],
            customer_name=sale["customer_name"],
            customer_phone=sale["customer_phone"],
            total_amount=sale["total_amount"],
            currency=sale["currency"],
            payment_method=sale["payment_method"],
            payment_status=sale["payment_status"],
            receipt_number=sale["receipt_number"],
            created_at=sale["created_at"],
            items=[SaleItemOut(**i) for i in items_result.data],
        ),
        "sme_name": sme["business_name"],
        "sme_phone": sme["phone"],
        "business_name": sme["business_name"],
    }


@router.get("/sales/{sale_id}/receipt-pdf")
async def download_receipt_pdf(
    sale_id: str,
    token: str | None = Query(None),
    authorization: str | None = Header(None),
    db: Client = Depends(get_db),
):
    from auth import get_sme_from_token

    actual_token = token
    if not actual_token and authorization and authorization.startswith("Bearer "):
        actual_token = authorization[7:]

    if not actual_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sme = get_sme_from_token(actual_token, db)
    sale_result = db.table("pos_sales").select("*").eq("id", sale_id).eq("sme_id", sme["id"]).execute()
    if not sale_result.data:
        raise HTTPException(status_code=404, detail="Sale not found")

    sale = sale_result.data[0]
    items_result = db.table("pos_sale_items").select("*").eq("sale_id", sale_id).execute()

    from services.receipt import generate_receipt_pdf
    file_path = generate_receipt_pdf(
        receipt_number=sale["receipt_number"],
        business_name=sme["business_name"],
        business_phone=sme["phone"],
        customer_name=sale.get("customer_name", ""),
        customer_phone=sale["customer_phone"],
        items=items_result.data,
        total_amount=sale["total_amount"],
        payment_method=sale["payment_method"],
        payment_status=sale["payment_status"],
        created_at=sale["created_at"],
    )

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=f"receipt-{sale['receipt_number']}.pdf",
    )


@router.get("/stats")
async def pos_stats(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    try:
        sales = db.table("pos_sales").select("total_amount, payment_status").eq("sme_id", sme["id"]).execute()
        products = db.table("products").select("id").eq("sme_id", sme["id"]).eq("is_active", True).execute()
    except Exception:
        return {
            "total_sales": 0,
            "total_revenue": 0,
            "pending_payments": 0,
            "active_products": 0,
        }

    total_sales = len(sales.data)
    total_revenue = sum(s["total_amount"] for s in sales.data if s["payment_status"] == "completed")
    pending = sum(1 for s in sales.data if s["payment_status"] == "pending")

    # Subtract withdrawals from revenue
    try:
        payouts_result = db.table("payouts").select("amount").eq("sme_id", sme["id"]).eq("status", "completed").execute()
        total_revenue -= sum(p["amount"] for p in payouts_result.data)
    except Exception:
        pass

    return {
        "total_sales": total_sales,
        "total_revenue": total_revenue,
        "pending_payments": pending,
        "active_products": len(products.data),
    }


@router.post("/sales/{sale_id}/send-receipt")
async def send_receipt(sale_id: str, channel: str = "whatsapp", sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    sale_result = db.table("pos_sales").select("*").eq("id", sale_id).eq("sme_id", sme["id"]).execute()
    if not sale_result.data:
        raise HTTPException(status_code=404, detail="Sale not found")

    sale = sale_result.data[0]
    items_result = db.table("pos_sale_items").select("*").eq("sale_id", sale_id).execute()

    # Build receipt message
    method_label = "MTN Mobile Money" if sale["payment_method"] == "momo" else "Orange Money"
    items_text = "\n".join([
        f"  {i['product_name']}  x{i['quantity']}  {i['subtotal']:,} XAF"
        for i in items_result.data
    ])

    message = (
        f"=== {sme['business_name']} ===\n"
        f"Receipt #{sale['receipt_number']}\n"
        f"Date: {sale['created_at'][:10]}\n\n"
        f"Items:\n{items_text}\n\n"
        f"Total: {sale['total_amount']:,} XAF\n"
        f"Payment: {method_label}\n"
        f"Status: {sale['payment_status'].upper()}\n\n"
        f"Thank you for your purchase!\n"
        f"Contact: {sme['business_name']} | {sme['phone']}"
    )

    if channel == "whatsapp":
        from services.whatsapp import send_whatsapp
        try:
            await send_whatsapp(sale["customer_phone"], message, sme_id=sme["id"])
            return {"message": "Receipt sent via WhatsApp", "channel": "whatsapp"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to send via WhatsApp: {str(e)}")
    elif channel == "email":
        # Would need customer email - return error if not available
        raise HTTPException(status_code=400, detail="Email receipts require customer email address")
    else:
        raise HTTPException(status_code=400, detail="Invalid channel. Use 'whatsapp' or 'email'")
