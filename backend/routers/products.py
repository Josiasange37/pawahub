from fastapi import APIRouter, Depends, HTTPException
from schemas import ProductCreate, ProductUpdate, ProductOut
from auth import get_current_sme
from database import get_db
from supabase import Client

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
async def list_products(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    try:
        result = db.table("products").select("*").eq("sme_id", sme["id"]).order("created_at", desc=True).execute()
        return [ProductOut(**p) for p in result.data]
    except Exception:
        return []


@router.post("", response_model=ProductOut)
async def create_product(body: ProductCreate, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    try:
        result = db.table("products").insert({
            "sme_id": sme["id"],
            "name": body.name,
            "description": body.description,
            "price": body.price,
            "stock": body.stock,
        }).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create product")
        return ProductOut(**result.data[0])
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable. Please run migrations.")


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(product_id: str, body: ProductUpdate, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = db.table("products").update(updates).eq("id", product_id).eq("sme_id", sme["id"]).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Product not found")
        return ProductOut(**result.data[0])
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable. Please run migrations.")


@router.delete("/{product_id}")
async def delete_product(product_id: str, sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    try:
        result = db.table("products").delete().eq("id", product_id).eq("sme_id", sme["id"]).execute()
        return {"message": "Product deleted"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable. Please run migrations.")
