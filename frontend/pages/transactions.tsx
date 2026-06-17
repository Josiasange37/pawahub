import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";
import { showToast } from "../components/Toast";
import { CreditCard, Search, CheckCircle, Clock, XCircle, AlertCircle, ChevronDown } from "lucide-react";

interface Transaction {
  id: string;
  subscriber_id: string;
  amount: number;
  provider: string;
  status: string;
  pawapay_status: string;
  error_message: string;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    completed: { cls: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: <CheckCircle className="w-3 h-3" /> },
    pending:   { cls: "bg-yellow-50 text-yellow-600 border border-yellow-200",   icon: <Clock className="w-3 h-3" /> },
    failed:    { cls: "bg-red-50 text-red-500 border border-red-200",             icon: <XCircle className="w-3 h-3" /> },
    timeout:   { cls: "bg-gray-100 text-gray-500 border border-gray-200",         icon: <AlertCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? map.timeout;
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
      {s.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

const SUMMARY_STATS = (txs: Transaction[]) => [
  { label: "Total Volume", value: `${txs.reduce((a, t) => a + t.amount, 0).toLocaleString()} XAF`, icon: <CreditCard className="w-5 h-5" />, bg: "bg-[#8B5CF6] text-white", iconBg: "bg-white/20" },
  { label: "Completed", value: txs.filter(t => t.status === "completed").length, icon: <CheckCircle className="w-5 h-5" />, bg: "bg-white border border-gray-100", iconBg: "bg-emerald-100 text-emerald-500" },
  { label: "Pending", value: txs.filter(t => t.status === "pending").length, icon: <Clock className="w-5 h-5" />, bg: "bg-white border border-gray-100", iconBg: "bg-yellow-100 text-yellow-500" },
  { label: "Failed", value: txs.filter(t => t.status === "failed").length, icon: <XCircle className="w-5 h-5" />, bg: "bg-white border border-gray-100", iconBg: "bg-red-100 text-red-400" },
];

export default function Transactions() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api("/api/billing/transactions", { token })
      .then(setTxs)
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = txs.filter(tx => {
    const matchSearch = tx.provider?.toLowerCase().includes(search.toLowerCase()) ||
      tx.amount.toString().includes(search) ||
      tx.status.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || tx.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = SUMMARY_STATS(txs);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">All billing activity and payment history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`rounded-2xl p-4 sm:p-5 shadow-sm ${s.bg}`}>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className={`text-[10px] sm:text-xs font-semibold ${i === 0 ? "text-white/70" : "text-gray-400"}`}>{s.label}</p>
              <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${s.iconBg}`}>{s.icon}</div>
            </div>
            <p className={`text-lg sm:text-2xl font-bold tracking-tight ${i === 0 ? "text-white" : "text-gray-900"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="flex flex-col sm:flex-wrap sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Transaction History</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter */}
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="appearance-none text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-8 outline-none focus:border-[#8B5CF6] font-medium text-gray-600 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="timeout">Timeout</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            {/* Search */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                className="text-xs sm:text-sm bg-transparent outline-none placeholder:text-gray-400 w-24 sm:w-36 min-w-0"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-6">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-7 h-7 text-[#8B5CF6]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{search || filter !== "all" ? "No results" : "No transactions yet"}</h3>
            <p className="text-gray-400 text-sm">
              {search || filter !== "all" ? "Try adjusting your filters." : "Transactions will appear here once you charge subscribers."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 font-semibold border-b border-gray-100">
                  <th className="text-left px-2 sm:px-3 py-3 hidden sm:table-cell">Amount</th>
                  <th className="text-left px-2 sm:px-3 py-3 hidden md:table-cell">Provider</th>
                  <th className="text-left px-2 sm:px-3 py-3">Status</th>
                  <th className="text-left px-2 sm:px-3 py-3 hidden lg:table-cell">pawaPay Status</th>
                  <th className="text-left px-2 sm:px-3 py-3 hidden md:table-cell">Date</th>
                  <th className="text-left px-3 sm:px-6 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition">
                    <td className="px-2 sm:px-3 py-3 font-bold text-gray-900 hidden sm:table-cell">
                      {tx.amount.toLocaleString()} <span className="text-gray-400 font-normal text-xs">XAF</span>
                    </td>
                    <td className="px-2 sm:px-3 py-3 hidden md:table-cell">
                      {tx.provider ? (
                        <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-lg">{tx.provider}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-2 sm:px-3 py-3"><StatusBadge status={tx.status} /></td>
                    <td className="px-2 sm:px-3 py-3 text-gray-500 text-xs hidden lg:table-cell">{tx.pawapay_status || "—"}</td>
                    <td className="px-2 sm:px-3 py-3 text-gray-400 text-xs hidden md:table-cell whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-500 truncate max-w-[180px] block">
                      {tx.error_message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {txs.length} transactions
          </div>
        )}
      </div>
    </div>
  );
}
