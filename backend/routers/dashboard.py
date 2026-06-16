import logging
from fastapi import APIRouter, Depends
from auth import get_current_sme
from database import get_db
from supabase import Client
from schemas import DashboardStats, MonthlyPoint, RecentOrder
from datetime import datetime
from collections import defaultdict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


@router.get("/stats", response_model=DashboardStats)
async def get_stats(sme: dict = Depends(get_current_sme), db: Client = Depends(get_db)):
    try:
        now = datetime.utcnow()
        this_year, this_month = now.year, now.month
        last_month = this_month - 1 if this_month > 1 else 12
        last_year = this_year if this_month > 1 else this_year - 1

        this_start = datetime(this_year, this_month, 1)
        last_start = datetime(last_year, last_month, 1)
        last_end = this_start

        subs = db.table("subscribers").select("*").eq("sme_id", sme["id"]).execute()
        total_subs = len(subs.data)
        active_subs = sum(1 for s in subs.data if s["is_active"])

        new_subs = sum(1 for s in subs.data if s.get("created_at", "") >= this_start.isoformat())
        prev_new_subs = sum(
            1 for s in subs.data
            if last_start.isoformat() <= s.get("created_at", "") < last_end.isoformat()
        )

        prev_total = sum(1 for s in subs.data if s.get("created_at", "") < this_start.isoformat())

        sub_ids = [s["id"] for s in subs.data]

        if sub_ids:
            txs = db.table("transactions").select("amount, status, created_at").eq("sme_id", sme["id"]).execute()
            cycles = db.table("payment_cycles").select("*").in_("subscriber_id", sub_ids).execute()
        else:
            txs = type("obj", (), {"data": []})()
            cycles = type("obj", (), {"data": []})()

        total_revenue = 0
        this_month_rev = 0
        last_month_rev = 0

        monthly_buckets = defaultdict(lambda: {"sales": 0, "revenue": 0})

        for t in txs.data:
            if t.get("status") == "completed":
                amt = t["amount"]
                total_revenue += amt
                created = t.get("created_at", "")
                if created >= this_start.isoformat():
                    this_month_rev += amt
                if last_start.isoformat() <= created < last_end.isoformat():
                    last_month_rev += amt

                try:
                    dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    key = f"{dt.year}-{dt.month:02d}"
                    monthly_buckets[key]["sales"] += 1
                    monthly_buckets[key]["revenue"] += amt
                except Exception:
                    pass

        pending = sum(1 for c in cycles.data if c["status"] == "pending")
        failed = sum(1 for c in cycles.data if c["status"] in ("failed", "timeout"))
        completed_cycles = sum(1 for c in cycles.data if c["status"] == "paid")
        total_cycles = pending + failed + completed_cycles
        success_rate = round((completed_cycles / total_cycles * 100) if total_cycles > 0 else 0, 1)

        prev_pending = sum(
            1 for c in cycles.data
            if c["status"] == "pending"
            and last_start.isoformat() <= c.get("created_at", "") < last_end.isoformat()
        )

        def pct_change(current, previous):
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return round((current - previous) / previous * 100, 1)

        chart = []
        for i in range(11, -1, -1):
            m = this_month - i
            y = this_year
            while m < 1:
                m += 12
                y -= 1
            while m > 12:
                m -= 12
                y += 1
            key = f"{y}-{m:02d}"
            pt = monthly_buckets.get(key, {"sales": 0, "revenue": 0})
            chart.append(MonthlyPoint(month=MONTH_NAMES[m - 1], sales=pt["sales"], revenue=pt["revenue"]))

        recent_orders = []
        if sub_ids:
            recent_cycles = (
                db.table("payment_cycles")
                .select("*")
                .in_("subscriber_id", sub_ids)
                .order("created_at", desc=True)
                .limit(10)
                .execute()
            )
            sub_map = {s["id"]: s for s in subs.data}
            for c in recent_cycles.data:
                sub_info = sub_map.get(c["subscriber_id"]) or {}
                recent_orders.append(RecentOrder(
                    id=str(c["id"])[-8:],
                    customer=sub_info.get("name", "Unknown"),
                    phone=sub_info.get("phone", ""),
                    date=c.get("created_at", "")[:10] if c.get("created_at") else "",
                    category="Abonnement",
                    status=c.get("status", "unknown").capitalize(),
                    amount=c["amount"],
                ))

            recent_sales = (
                db.table("pos_sales")
                .select("id, customer_name, customer_phone, total_amount, payment_status, created_at")
                .eq("sme_id", sme["id"])
                .order("created_at", desc=True)
                .limit(10)
                .execute()
            )
            for s in recent_sales.data:
                recent_orders.append(RecentOrder(
                    id=str(s["id"])[-8:],
                    customer=s.get("customer_name") or s.get("customer_phone", "Unknown"),
                    phone=s.get("customer_phone", ""),
                    date=s.get("created_at", "")[:10] if s.get("created_at") else "",
                    category="Vente POS",
                    status=s.get("payment_status", "unknown").capitalize(),
                    amount=s["total_amount"],
                ))

            recent_orders.sort(key=lambda r: r.date, reverse=True)
            recent_orders = recent_orders[:10]

        return DashboardStats(
            total_subscribers=total_subs,
            active_subscribers=active_subs,
            total_revenue=total_revenue,
            monthly_revenue=this_month_rev,
            pending_payments=pending,
            failed_payments=failed,
            success_rate=success_rate,
            prev_total_subscribers=prev_total,
            subscribers_change_pct=pct_change(total_subs, prev_total) if prev_total else 0.0,
            new_subscribers=new_subs,
            prev_new_subscribers=prev_new_subs,
            new_subscribers_change_pct=pct_change(new_subs, prev_new_subs),
            prev_monthly_revenue=last_month_rev,
            revenue_change_pct=pct_change(this_month_rev, last_month_rev),
            prev_pending_payments=prev_pending,
            pending_change_pct=pct_change(pending, prev_pending),
            monthly_chart=chart,
            recent_orders=recent_orders,
        )
    except Exception as e:
        logger.warning(f"Dashboard stats error: {e}", exc_info=True)
        return DashboardStats(
            total_subscribers=0,
            active_subscribers=0,
            total_revenue=0,
            monthly_revenue=0,
            pending_payments=0,
            failed_payments=0,
            success_rate=0.0,
        )
