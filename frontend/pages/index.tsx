import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";
import { SkeletonCards } from "../components/Skeleton";
import { showToast } from "../components/Toast";

interface Stats {
  total_subscribers: number;
  active_subscribers: number;
  total_revenue: number;
  monthly_revenue: number;
  pending_payments: number;
  failed_payments: number;
  success_rate: number;
}

interface POSStats {
  total_sales: number;
  total_revenue: number;
  pending_payments: number;
  active_products: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [posStats, setPosStats] = useState<POSStats | null>(null);
  const [useCase, setUseCase] = useState<string>("subscriptions");
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Fetch preferences first
    api("/api/preferences", { token })
      .then((prefs) => {
        setUseCase(prefs.use_case || "subscriptions");
        if (prefs.use_case === "sales") {
          return api("/api/pos/stats", { token });
        } else {
          return api("/api/dashboard/stats", { token });
        }
      })
      .then((data) => {
        if (useCase === "sales" || data.active_products !== undefined) {
          setPosStats(data);
        } else {
          setStats(data);
        }
      })
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  const runBilling = async () => {
    setBillingLoading(true);
    try {
      const res = await api("/api/billing/trigger", { method: "POST", token: getToken()! });
      showToast(res.message, "success");
      setTimeout(async () => {
        const fresh = await api("/api/dashboard/stats", { token: getToken()! });
        setStats(fresh);
      }, 5000);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setBillingLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="animate-pulse bg-gray-200 rounded h-8 w-48" />
          <div className="animate-pulse bg-gray-200 rounded-lg h-10 w-36" />
        </div>
        <SkeletonCards count={4} />
      </div>
    );
  }

  const isNewUser = useCase === "subscriptions"
    ? stats?.total_subscribers === 0 && stats?.total_revenue === 0
    : posStats?.total_sales === 0 && posStats?.total_revenue === 0;

  // Subscription mode dashboard
  if (useCase === "subscriptions" && stats) {
    const cards = [
      { label: "Total Subscribers", value: String(stats.total_subscribers), color: "bg-blue-50 text-blue-700", icon: "👥" },
      { label: "Active", value: String(stats.active_subscribers), color: "bg-green-50 text-green-700", icon: "✅" },
      { label: "Revenue (XAF)", value: stats.total_revenue.toLocaleString(), color: "bg-purple-50 text-purple-700", icon: "💰" },
      { label: "Success Rate", value: `${stats.success_rate}%`, color: "bg-teal-50 text-teal-700", icon: "📊" },
    ];

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={runBilling}
            disabled={billingLoading}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
          >
            {billingLoading && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
            {billingLoading ? "Processing..." : "Run Payments"}
          </button>
        </div>

        {isNewUser && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-blue-900 mb-3">Quick Setup Checklist</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                <span>Create your first subscription plan</span>
                <a href="/plans" className="ml-auto text-blue-600 hover:underline text-xs font-medium">Go →</a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
                <span>Add your first subscriber</span>
                <a href="/subscribers" className="ml-auto text-blue-600 hover:underline text-xs font-medium">Go →</a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">3</span>
                <span>Connect WhatsApp for notifications</span>
                <a href="/onboarding" className="ml-auto text-blue-600 hover:underline text-xs font-medium">Go →</a>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((c) => (
            <div key={c.label} className={`p-6 rounded-xl ${c.color} transition hover:scale-[1.02]`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm opacity-75">{c.label}</p>
                <span className="text-lg">{c.icon}</span>
              </div>
              <p className="text-3xl font-bold mt-1">{c.value}</p>
            </div>
          ))}
        </div>

        {(stats.pending_payments > 0 || stats.failed_payments > 0) && (
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h2 className="font-semibold mb-4">Needs Attention</h2>
            <div className="space-y-2">
              {stats.pending_payments > 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-yellow-600 text-sm font-medium">Pending Payments</span>
                  <span className="text-yellow-600 text-lg font-bold">{stats.pending_payments}</span>
                </div>
              )}
              {stats.failed_payments > 0 && (
                <div className="bg-red-50 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-red-600 text-sm font-medium">Failed Payments</span>
                  <span className="text-red-600 text-lg font-bold">{stats.failed_payments}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Sales mode dashboard
  if (posStats) {
    const cards = [
      { label: "Total Sales", value: String(posStats.total_sales), color: "bg-blue-50 text-blue-700", icon: "🧾" },
      { label: "Revenue (XAF)", value: posStats.total_revenue.toLocaleString(), color: "bg-green-50 text-green-700", icon: "💰" },
      { label: "Active Products", value: String(posStats.active_products), color: "bg-purple-50 text-purple-700", icon: "📦" },
      { label: "Pending", value: String(posStats.pending_payments), color: "bg-yellow-50 text-yellow-700", icon: "⏳" },
    ];

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <a href="/pos" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
            + New Sale
          </a>
        </div>

        {isNewUser && (
          <div className="bg-gradient-to-r from-green-50 to-yellow-50 border border-green-200 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-green-900 mb-3">Quick Setup Checklist</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">1</span>
                <span>Add your products with prices</span>
                <a href="/pos?tab=products" className="ml-auto text-green-600 hover:underline text-xs font-medium">Go →</a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">2</span>
                <span>Make your first sale</span>
                <a href="/pos" className="ml-auto text-green-600 hover:underline text-xs font-medium">Go →</a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">3</span>
                <span>Connect WhatsApp for receipts</span>
                <a href="/onboarding" className="ml-auto text-green-600 hover:underline text-xs font-medium">Go →</a>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((c) => (
            <div key={c.label} className={`p-6 rounded-xl ${c.color} transition hover:scale-[1.02]`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm opacity-75">{c.label}</p>
                <span className="text-lg">{c.icon}</span>
              </div>
              <p className="text-3xl font-bold mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
