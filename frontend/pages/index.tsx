import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";

interface Stats {
  total_subscribers: number;
  active_subscribers: number;
  total_revenue: number;
  monthly_revenue: number;
  pending_payments: number;
  failed_payments: number;
  success_rate: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api("/api/dashboard/stats", { token }).then(setStats).catch((e) => {
      console.error("Dashboard stats error:", e);
      setError(e.message);
    });
  }, []);

  if (error) return <p className="text-center text-red-500 mt-12">{error}</p>;
  if (!stats) return <p className="text-center text-gray-500 mt-12">Loading...</p>;

  const runBilling = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await api("/api/billing/trigger", { method: "POST", token: getToken()! });
      setMsg(res.message);
      setTimeout(() => { api("/api/dashboard/stats", { token: getToken()! }).then(setStats).catch(() => {}); }, 5000);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: "Total Subscribers", value: String(stats.total_subscribers), color: "bg-blue-50 text-blue-700" },
    { label: "Active", value: String(stats.active_subscribers), color: "bg-green-50 text-green-700" },
    { label: "Revenue (XAF)", value: stats.total_revenue.toLocaleString(), color: "bg-purple-50 text-purple-700" },
    { label: "Success Rate", value: `${stats.success_rate}%`, color: "bg-teal-50 text-teal-700" },
  ];

  const alerts = [
    { label: "Pending Payments", value: stats.pending_payments, color: "text-yellow-600" },
    { label: "Failed Payments", value: stats.failed_payments, color: "text-red-600" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button onClick={runBilling} disabled={loading} className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50">
          {loading ? "Processing..." : "Run Payments"}
        </button>
      </div>

      {msg && <p className="bg-yellow-50 text-yellow-800 p-3 rounded-lg mb-4 text-sm">{msg}</p>}

      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className={`p-6 rounded-xl ${c.color}`}>
            <p className="text-sm opacity-75">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {alerts.some((a) => a.value > 0) && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="font-semibold mb-4">Needs Attention</h2>
          {alerts.filter(a => a.value > 0).map((a) => (
            <p key={a.label} className={`${a.color} text-sm`}>
              {a.label}: {a.value}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
