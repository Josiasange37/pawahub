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

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api("/api/dashboard/stats", { token }).then(setStats).catch(() => {});
  }, []);

  if (!stats) return <p>Loading...</p>;

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
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

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
