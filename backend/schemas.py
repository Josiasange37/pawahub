from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import date, datetime


class SMEBase(BaseModel):
    email: str
    business_name: str
    phone: str


class SMERegister(SMEBase):
    password: str


class SMELogin(BaseModel):
    email: str
    password: str


class SMEOut(SMEBase):
    id: UUID
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    sme: SMEOut


class PlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    amount: int
    interval_days: int = 30


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[int] = None
    interval_days: Optional[int] = None
    is_active: Optional[bool] = None


class PlanOut(BaseModel):
    id: UUID
    sme_id: UUID
    name: str
    description: Optional[str]
    amount: int
    currency: str = "XAF"
    interval_days: int
    is_active: bool
    created_at: datetime


class SubscriberCreate(BaseModel):
    plan_id: UUID
    name: str
    phone: str
    email: str = ""


class SubscriberOut(BaseModel):
    id: UUID
    sme_id: UUID
    plan_id: UUID
    name: str
    phone: str
    email: str
    is_active: bool
    created_at: datetime


class PaymentCycleOut(BaseModel):
    id: UUID
    subscriber_id: UUID
    plan_id: UUID
    amount: int
    currency: str
    due_date: date
    status: str
    retry_count: int
    last_attempt_at: Optional[datetime]
    created_at: datetime


class TransactionOut(BaseModel):
    id: UUID
    sme_id: UUID
    cycle_id: Optional[UUID]
    subscriber_id: UUID
    plan_id: Optional[UUID]
    pawapay_deposit_id: Optional[str]
    amount: int
    currency: str
    provider: Optional[str]
    status: str
    pawapay_status: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime


class DashboardStats(BaseModel):
    total_subscribers: int
    active_subscribers: int
    total_revenue: int
    monthly_revenue: int
    pending_payments: int
    failed_payments: int
    success_rate: float


class PreferencesCreate(BaseModel):
    business_type: str  # "solo" or "enterprise"
    use_case: str  # "subscriptions" or "sales"


class PreferencesOut(BaseModel):
    id: UUID
    sme_id: UUID
    business_type: str
    use_case: str
    onboarding_complete: bool
    created_at: datetime


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: int


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: UUID
    sme_id: UUID
    name: str
    description: Optional[str]
    price: int
    currency: str = "XAF"
    is_active: bool
    created_at: datetime


class SaleItemInput(BaseModel):
    product_id: UUID
    quantity: int


class SaleCreate(BaseModel):
    items: list[SaleItemInput]
    customer_name: Optional[str] = None
    customer_phone: str
    payment_method: str = "momo"  # "momo" or "orange"


class SaleItemOut(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    quantity: int
    unit_price: int
    subtotal: int


class SaleOut(BaseModel):
    id: UUID
    sme_id: UUID
    customer_name: Optional[str]
    customer_phone: str
    total_amount: int
    currency: str
    payment_method: str
    payment_status: str
    receipt_number: Optional[str]
    created_at: datetime
    items: list[SaleItemOut] = []


class ReceiptData(BaseModel):
    sale: SaleOut
    sme_name: str
    sme_phone: str
    business_name: str
