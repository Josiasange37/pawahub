import { useEffect, useState, useRef } from "react";
import { api, getToken, getSme, getPreferencesFallback } from "../lib/api";
import { showToast } from "../components/Toast";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  ShoppingCart, Users, Package, TrendingUp, MoreHorizontal,
  Search, ArrowUpDown, ArrowUp, ArrowDown, Bell, Settings,
  Zap, ChevronDown, Download
} from "lucide-react";

gsap.registerPlugin(useGSAP);

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

// Mock chart data — replace with real API data as needed
const monthlyData = [
  { month: "May",  sales: 18000, revenue: 14000 },
  { month: "Jun",  sales: 22000, revenue: 18000 },
  { month: "Jul",  sales: 19000, revenue: 15000 },
  { month: "Aug",  sales: 38000, revenue: 32000 },
  { month: "Sep",  sales: 16000, revenue: 12000 },
  { month: "Oct",  sales: 21000, revenue: 17000 },
  { month: "Nov",  sales: 14000, revenue: 11000 },
  { month: "Dec",  sales: 25000, revenue: 20000 },
];

const recentOrders = [
  { id: "#FP-9021", customer: "Amina Diallo",    date: "2 Jun 2026", category: "Abonnement",  status: "Pending",   amount: "12 500 XAF" },
  { id: "#FP-9020", customer: "Koffi Mensah",    date: "1 Jun 2026", category: "Vente POS",   status: "Completed", amount: "7 800 XAF"  },
  { id: "#FP-9019", customer: "Fatou Ndiaye",    date: "31 Mai 2026", category: "Abonnement", status: "Completed", amount: "5 000 XAF"  },
  { id: "#FP-9018", customer: "Jean-Paul Biya",  date: "30 Mai 2026", category: "Vente POS",  status: "Failed",    amount: "3 200 XAF"  },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-xl rounded-2xl px-4 py-3 border border-gray-100 text-sm">
        <p className="font-bold text-gray-800 mb-1">{label} 2026</p>
        <div className="flex items-center gap-2 text-gray-500">
          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
          Total Sales <span className="ml-auto font-semibold text-gray-800">{(payload[0].value / 1000).toFixed(0)}k</span>
        </div>
        <div className="flex items-center gap-2 text-[#8B5CF6]">
          <span className="w-2 h-2 rounded-full bg-[#8B5CF6] inline-block" />
          Total Revenue <span className="ml-auto font-bold text-[#8B5CF6]">{(payload[1]?.value / 1000).toFixed(1)}k XAF</span>
        </div>
      </div>
    );
  }
  return null;
};

// Gauge component (semi-circle using SVG)
function GaugeChart({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const colors = ["#f97316","#fb923c","#fdba74","#fcd34d","#fde68a"];
  const segments = 5;
  const r = 70;
  const cx = 100;
  const cy = 100;
  const start = Math.PI;
  const end = 0;
  const total = end - start; // negative = -π
  const segAngle = Math.abs(total) / segments;

  const polarToCartesian = (angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const arcPath = (startAngle: number, endAngle: number, color: string, idx: number) => {
    const s = polarToCartesian(startAngle);
    const e = polarToCartesian(endAngle);
    const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
    // invert direction for semi-circle on top
    const d = `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
    const isActive = idx < Math.round((pct / 100) * segments);
    return <path key={idx} d={d} fill="none" strokeWidth="16" stroke={isActive ? color : "#f3f4f6"} strokeLinecap="round" />;
  };

  const arcs = Array.from({ length: segments }, (_, i) => {
    const sa = Math.PI + i * segAngle + 0.05;
    const ea = Math.PI + (i + 1) * segAngle - 0.05;
    return arcPath(sa, ea, colors[i], i);
  });

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="115" viewBox="0 0 200 115">
        {arcs}
      </svg>
      <p className="text-4xl font-bold text-gray-900 -mt-10">{pct.toFixed(1)}%</p>
      <p className="text-xs text-gray-400 font-medium mt-1">Sales Growth</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending:   "bg-yellow-50 text-yellow-600 border border-yellow-200",
    Completed: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    Failed:    "bg-red-50 text-red-500 border border-red-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [posStats, setPosStats] = useState<POSStats | null>(null);
  const [useCase, setUseCase] = useState<string>("subscriptions");
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sme = getSme();

  useGSAP(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
      );
      gsap.fromTo(".dash-card",
        { opacity: 0, y: 24, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.08, ease: "back.out(1.2)" }
      );
    }
  }, [loading]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const smeObj = getSme();

    const loadStats = (uc: string) => {
      const endpoint = uc === "sales" ? "/api/pos/stats" : "/api/dashboard/stats";
      return api(endpoint, { token }).then((data) => {
        if (uc === "sales") setPosStats(data);
        else setStats(data);
      });
    };

    api("/api/preferences", { token })
      .then((prefs) => {
        const local = smeObj ? getPreferencesFallback(smeObj.id) : null;
        const final = prefs?.onboarding_complete ? prefs : (local?.onboarding_complete ? local : prefs);
        const uc = final?.use_case || "subscriptions";
        setUseCase(uc);
        return loadStats(uc);
      })
      .catch(() => {
        const local = smeObj ? getPreferencesFallback(smeObj.id) : null;
        if (local) {
          const uc = local.use_case || "subscriptions";
          setUseCase(uc);
          return loadStats(uc);
        }
      })
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

  // Derived stats
  const totalSales = useCase === "sales" ? posStats?.total_sales : stats?.total_subscribers;
  const revenue = useCase === "sales" ? posStats?.total_revenue : stats?.total_revenue;
  const activeCount = useCase === "sales" ? posStats?.active_products : stats?.active_subscribers;
  const successRate = stats?.success_rate ?? (posStats ? 70.8 : 0);
  const monthlyRev = stats?.monthly_revenue ?? 0;

  const statCards = [
    {
      label: useCase === "sales" ? "Total Sales" : "Total Subscribers",
      value: String(totalSales ?? 0),
      prev: useCase === "sales" ? "Last month: —" : `Last month: ${Math.max(0, (stats?.total_subscribers ?? 0) - 10)}`,
      change: "+4.9%",
      up: true,
      icon: <ShoppingCart className="w-5 h-5" />,
      accent: "bg-[#8B5CF6] text-white",
      iconBg: "bg-white/20",
    },
    {
      label: useCase === "sales" ? "Active Products" : "New Subscribers",
      value: String(activeCount ?? 0),
      prev: "Last month: —",
      change: "+7.1%",
      up: true,
      icon: <Package className="w-5 h-5" />,
      accent: "bg-white border border-gray-100",
      iconBg: "bg-orange-100 text-orange-500",
    },
    {
      label: "Pending Payments",
      value: String(useCase === "sales" ? (posStats?.pending_payments ?? 0) : (stats?.pending_payments ?? 0)),
      prev: "Last month: —",
      change: "-6.0%",
      up: false,
      icon: <TrendingUp className="w-5 h-5" />,
      accent: "bg-white border border-gray-100",
      iconBg: "bg-sky-100 text-sky-500",
    },
    {
      label: "Total Revenue (XAF)",
      value: (revenue ?? 0).toLocaleString(),
      prev: `Monthly: ${monthlyRev.toLocaleString()}`,
      change: "+5.5%",
      up: true,
      icon: <Zap className="w-5 h-5" />,
      accent: "bg-white border border-gray-100",
      iconBg: "bg-purple-100 text-[#8B5CF6]",
    },
  ];

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-64 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="p-6 space-y-6 bg-[#f5f5f7] min-h-full">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your current sales summary and activity</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition">
            This Month <ChevronDown className="w-4 h-4 opacity-60" />
          </button>
          <button className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition">
            <Download className="w-4 h-4" /> Export
          </button>
          {useCase === "subscriptions" && (
            <button
              onClick={runBilling}
              disabled={billingLoading}
              className="flex items-center gap-2 text-sm font-semibold bg-[#8B5CF6] text-white px-5 py-2 rounded-xl hover:bg-purple-600 transition disabled:opacity-60 shadow-lg shadow-purple-200"
            >
              {billingLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {billingLoading ? "Processing…" : "Run Payments"}
            </button>
          )}
          {useCase === "sales" && (
            <a href="/pos" className="text-sm font-semibold bg-[#8B5CF6] text-white px-5 py-2 rounded-xl hover:bg-purple-600 transition shadow-lg shadow-purple-200">
              + New Sale
            </a>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={card.label} className={`dash-card rounded-2xl p-5 ${card.accent} shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-xs font-semibold ${i === 0 ? "text-white/80" : "text-gray-400"}`}>
                {card.label}
              </p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${i === 0 ? card.iconBg : card.iconBg}`}>
                {card.icon}
              </div>
            </div>
            <p className={`text-2xl font-bold tracking-tight mb-2 ${i === 0 ? "text-white" : "text-gray-900"}`}>
              {card.value}
            </p>
            <div className="flex items-center gap-1.5">
              <span className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${card.up ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"}`}>
                {card.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {card.change}
              </span>
              <span className={`text-xs ${i === 0 ? "text-white/60" : "text-gray-400"}`}>{card.prev}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Performance Bar Chart */}
        <div className="dash-card lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-gray-900">Performance Overview</h2>
            <button className="flex items-center gap-1 text-sm text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition">
              This Week <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#f5f5f7" strokeDasharray="3 3" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${v/1000}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="sales" radius={[8,8,8,8]} maxBarSize={36}>
                {monthlyData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={idx === activeBar ? "#8B5CF6" : "#e5e7eb"}
                    onClick={() => setActiveBar(idx === activeBar ? null : idx)}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </Bar>
              <Bar dataKey="revenue" radius={[8,8,8,8]} maxBarSize={36}>
                {monthlyData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={idx === activeBar ? "#7c3aed" : "#c4b5fd"}
                    onClick={() => setActiveBar(idx === activeBar ? null : idx)}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sales Growth Gauge */}
        <div className="dash-card bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Sales Overview</h2>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <GaugeChart value={successRate} />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">
                {useCase === "sales" ? "Number of Sales" : "Subscribers"}
              </p>
              <p className="text-xl font-bold text-gray-900">{totalSales?.toLocaleString() ?? "—"}</p>
              <span className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 mt-1">
                <ArrowUp className="w-3 h-3" />4.5%
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">
                {revenue ? `${(revenue / 1000).toFixed(1)}k XAF` : "—"}
              </p>
              <span className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 mt-1">
                <ArrowUp className="w-3 h-3" />5.5%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="dash-card bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Recent orders</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                className="text-sm bg-transparent outline-none placeholder:text-gray-400 w-36"
                placeholder="Search orders..."
              />
            </div>
            <button className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-100 transition">
              <ArrowUpDown className="w-4 h-4" /> Sort by <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 font-semibold border-b border-gray-100">
              <th className="text-left px-6 py-3 w-8"><input type="checkbox" className="rounded" /></th>
              <th className="text-left px-3 py-3">Order ID</th>
              <th className="text-left px-3 py-3">Customer</th>
              <th className="text-left px-3 py-3">Date</th>
              <th className="text-left px-3 py-3">Category</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-right px-6 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order, i) => (
              <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-3.5"><input type="checkbox" className="rounded" /></td>
                <td className="px-3 py-3.5 font-mono text-xs font-semibold text-gray-500">{order.id}</td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#10B981] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {order.customer.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-800">{order.customer}</span>
                  </div>
                </td>
                <td className="px-3 py-3.5 text-gray-400">{order.date}</td>
                <td className="px-3 py-3.5 text-gray-500">{order.category}</td>
                <td className="px-3 py-3.5"><StatusBadge status={order.status} /></td>
                <td className="px-6 py-3.5 text-right font-semibold text-gray-900">{order.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
