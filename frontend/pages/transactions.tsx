import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";
import { SkeletonTable } from "../components/Skeleton";
import { showToast } from "../components/Toast";

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

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  timeout: "bg-gray-100 text-gray-500",
};

export default function Transactions() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api("/api/billing/transactions", { token })
      .then(setTxs)
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : txs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💸</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No transactions yet</h3>
          <p className="text-gray-500 text-sm">Transactions will appear here once you charge subscribers.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500 bg-gray-50">
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Provider</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">pawaPay</th>
                <th className="p-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="p-4 font-medium">{tx.amount.toLocaleString()} XAF</td>
                  <td className="p-4 text-sm">{tx.provider || "—"}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[tx.status] || "bg-gray-100"}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{tx.pawapay_status || "—"}</td>
                  <td className="p-4 text-sm text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
