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
    business_type: str = "solo"


class SMELogin(BaseModel):
    email: str
    password: str


class SMEOut(SMEBase):
    id: UUID
    business_type: str = "solo"
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
    whatsapp: str = ""


class SubscriberOut(BaseModel):
    id: UUID
    sme_id: UUID
    plan_id: UUID
    name: str
    phone: str
    email: str = ""
    whatsapp: str = ""
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


class MonthlyPoint(BaseModel):
    month: str
    sales: int = 0
    revenue: int = 0

class RecentOrder(BaseModel):
    id: str
    customer: str
    phone: str = ""
    date: str
    category: str
    status: str
    amount: int

class DashboardStats(BaseModel):
    total_subscribers: int
    active_subscribers: int
    total_revenue: int
    monthly_revenue: int
    pending_payments: int
    failed_payments: int
    success_rate: float

    prev_total_subscribers: int = 0
    subscribers_change_pct: float = 0.0

    new_subscribers: int = 0
    prev_new_subscribers: int = 0
    new_subscribers_change_pct: float = 0.0

    prev_monthly_revenue: int = 0
    revenue_change_pct: float = 0.0

    prev_pending_payments: int = 0
    pending_change_pct: float = 0.0

    monthly_chart: list[MonthlyPoint] = []
    recent_orders: list[RecentOrder] = []


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
    stock: Optional[int] = 0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: UUID
    sme_id: UUID
    name: str
    description: Optional[str]
    price: int
    stock: Optional[int] = 0
    currency: str = "XAF"
    is_active: bool
    created_at: datetime


class SaleItemInput(BaseModel):
    product_id: UUID
    quantity: int
    price: Optional[int] = None


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


class PayoutCreate(BaseModel):
    amount: int
    phone: str


class PayoutOut(BaseModel):
    id: str
    sme_id: str
    pawapay_payout_id: str | None = None
    amount: int
    currency: str = "XAF"
    recipient_phone: str
    recipient_provider: str | None = None
    status: str = "pending"
    pawapay_status: str | None = None
    error_message: str | None = None
    created_at: str = ""
    updated_at: str = ""


class PayoutBalance(BaseModel):
    available_balance: int
    total_collected: int
    total_withdrawn: int
    pending_withdrawals: int
