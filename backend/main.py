from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from routers import auth, plans, subscribers, billing, webhooks, dashboard
from services.billing_engine import run_daily_billing

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(run_daily_billing, "interval", hours=6, id="daily_billing")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="PawaSub API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://pawahub.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(plans.router)
app.include_router(subscribers.router)
app.include_router(billing.router)
app.include_router(webhooks.router)
app.include_router(dashboard.router)


@app.get("/")
async def root():
    return {"message": "PawaSub API running", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/test-email")
async def test_email():
    from config import settings
    from services.email import send_email, HAS_RESEND
    result = {
        "has_resend_pkg": HAS_RESEND,
        "api_key_set": bool(settings.resend_api_key),
        "api_key_prefix": settings.resend_api_key[:8] + "..." if settings.resend_api_key else "NONE",
    }
    try:
        sent = await send_email(
            settings.gmail_address or "test@test.com",
            "PawaSub Test Email",
            "<h1>Test</h1><p>If you see this, Resend is working!</p>",
        )
        result["send_result"] = sent
    except Exception as e:
        result["error"] = str(e)
    return result
