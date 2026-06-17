import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";
import { showToast } from "../components/Toast";
import { Wallet, ArrowUpRight, Clock, CheckCircle, XCircle, Loader } from "lucide-react";

interface Payout {
  id: string;
  amount: number;
  currency: string;
  recipient_phone: string;
  recipient_provider: string | null;
  status: string;
  pawapay_status: string | null;
  error_message: string | null;
  created_at: string;
}

interface Balance {
  available_balance: number;
  total_collected: number;
  total_withdrawn: number;
  pending_withdrawals: number;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "";
  let cls = "bg-gray-100 text-gray-600 border border-gray-200";
  let icon = <Clock className="w-3 h-3" />;
  if (s === "completed") { cls = "bg-emerald-50 text-emerald-600 border border-emerald-200"; icon = <CheckCircle className="w-3 h-3" />; }
  else if (s === "processing" || s === "pending") { cls = "bg-yellow-50 text-yellow-600 border border-yellow-200"; icon = <Loader className="w-3 h-3 animate-spin" />; }
  else if (s === "failed") { cls = "bg-red-50 text-red-500 border border-red-200"; icon = <XCircle className="w-3 h-3" />; }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {icon} {status}
    </span>
  );
}

export default function WithdrawPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [bal, list] = await Promise.all([
        api("/api/payouts/balance", { token }),
        api("/api/payouts", { token }),
      ]);
      setBalance(bal);
      setPayouts(list);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleWithdraw = async () => {
    const amt = parseInt(amount);
    if (!amt || amt < 100) { showToast("Minimum withdrawal is 100 XAF", "error"); return; }
    if (!phone) { showToast("Recipient phone is required", "error"); return; }
    if (balance && amt > balance.available_balance) { showToast("Insufficient balance", "error"); return; }
    setSubmitting(true);
    try {
      await api("/api/payouts/withdraw", { method: "POST", token: getToken()!, body: { amount: amt, phone } });
      showToast("Withdrawal initiated!", "success");
      setAmount("");
      setPhone("");
      await loadData();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatXAF = (n: number) => n.toLocaleString() + " XAF";

  if (loading) {
    return (
      <div className="p-4 sm:p-8 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Withdraw Funds</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Withdraw your collected payments to mobile money</p>
        </div>
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Wallet className="w-5 h-5 text-[#8B5CF6]" />
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Available Balance", value: balance?.available_balance ?? 0, accent: "bg-[#8B5CF6] text-white" },
          { label: "Total Collected", value: balance?.total_collected ?? 0, accent: "bg-white border border-gray-100" },
          { label: "Total Withdrawn", value: balance?.total_withdrawn ?? 0, accent: "bg-white border border-gray-100" },
          { label: "Pending", value: balance?.pending_withdrawals ?? 0, accent: "bg-white border border-gray-100" },
        ].map((card, i) => (
          <div key={card.label} className={`rounded-2xl p-4 sm:p-5 ${card.accent} shadow-sm`}>
            <p className={`text-[10px] sm:text-xs font-semibold ${i === 0 ? "text-white/80" : "text-gray-400"}`}>
              {card.label}
            </p>
            <p className={`text-lg sm:text-2xl font-bold tracking-tight mt-2 ${i === 0 ? "text-white" : "text-gray-900"}`}>
              {formatXAF(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Withdrawal Form */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-4">Request Withdrawal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount (XAF)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Recipient Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2376XXXXXXXX"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleWithdraw}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-[#8B5CF6] text-white px-5 py-2.5 rounded-xl hover:bg-purple-600 transition disabled:opacity-60 shadow-lg shadow-purple-200"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
              {submitting ? "Processing..." : "Withdraw"}
            </button>
          </div>
        </div>
      </div>

      {/* Withdrawal History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm sm:text-base font-bold text-gray-900">Withdrawal History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 font-semibold border-b border-gray-100">
                <th className="text-left px-3 sm:px-4 py-3">Date</th>
                <th className="text-left px-3 sm:px-4 py-3">Phone</th>
                <th className="text-right px-3 sm:px-4 py-3">Amount</th>
                <th className="text-center px-3 sm:px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">No withdrawals yet</td></tr>
              )}
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 sm:px-4 py-3 text-gray-500 text-xs font-medium">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-gray-700 text-xs font-medium">{p.recipient_phone}</td>
                  <td className="px-3 sm:px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {p.amount.toLocaleString()} XAF
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
