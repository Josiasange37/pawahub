import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from routers import auth, plans, subscribers, billing, webhooks, dashboard, preferences, products, pos, notifications
from services.billing_engine import run_daily_billing
from services.whatsapp import warm_bot

scheduler = AsyncIOScheduler()


def run_migrations():
    try:
        import psycopg2
    except ImportError:
        return
    from config import settings
    from urllib.parse import urlparse
    parsed = urlparse(settings.supabase_url)
    db_host = parsed.hostname
    db_name = (parsed.path.lstrip("/") if parsed.path else "postgres").rsplit("?", 1)[0]
    db_user = "postgres"
    try:
        conn = psycopg2.connect(
            host=db_host, port=5432, dbname=db_name,
            user=db_user, password=settings.supabase_db_password,
            connect_timeout=5,
        )
        cur = conn.cursor()
        for sql in [
            "ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';",
            "ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT '';",
            "ALTER TABLE smes ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'solo';",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;",
        ]:
            try:
                cur.execute(sql)
            except Exception:
                pass
        conn.commit()
        cur.close()
        conn.close()
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    scheduler.add_job(run_daily_billing, "interval", hours=6, id="daily_billing")
    scheduler.add_job(warm_bot, "interval", minutes=5, id="bot_keep_warm")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Fluxpay API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://pawahub.vercel.app",
    ],
    allow_origin_regex=r"https?://.*\.railway\.app|https?://.*\.vercel\.app",
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
app.include_router(preferences.router)
app.include_router(products.router)
app.include_router(pos.router)
app.include_router(notifications.router)


@app.get("/")
async def root():
    return {"message": "Fluxpay API running", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


from pydantic import BaseModel


class MigrateRequest(BaseModel):
    db_password: str | None = None


@app.post("/api/migrate")
async def run_migration(body: MigrateRequest):
    try:
        import pg8000
        from config import settings

        project_ref = settings.supabase_url.split("//")[1].split(".")[0]
        host = "aws-0-eu-west-1.pooler.supabase.com"

        db_password = body.db_password or os.environ.get("SUPABASE_DB_PASSWORD")
        if not db_password:
            raise HTTPException(
                status_code=400,
                detail="DB password required. Pass `db_password` in body or set SUPABASE_DB_PASSWORD env var.",
            )

        import socket
        ip = socket.getaddrinfo(host, 6543, socket.AF_INET)[0][4][0]

        conn = pg8000.connect(
            host=ip,
            port=6543,
            database="postgres",
            user=f"postgres.{project_ref}",
            password=db_password,
            timeout=5,
        )
        cur = conn.cursor()

        with open("migration.sql") as f:
            sql = f.read()

        cur.execute(sql)
        conn.commit()
        cur.close()
        conn.close()
        return {"message": "Migration completed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)[:200]}")


@app.get("/test-email")
async def test_email():
    from config import settings
    from services.email import send_email
    result = {
        "api_key_set": bool(settings.resend_api_key),
        "api_key_prefix": settings.resend_api_key[:8] + "..." if settings.resend_api_key else "NONE",
    }
    try:
        sent = await send_email(
            settings.gmail_address or "test@test.com",
            "Fluxpay Test Email",
            "<h1>Test</h1><p>If you see this, Resend is working!</p>",
        )
        result["send_result"] = sent
    except Exception as e:
        result["error"] = str(e)
    return result
