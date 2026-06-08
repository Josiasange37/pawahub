import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";

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

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api("/api/billing/transactions", { token })
      .then(setTxs)
      .catch(() => setTxs([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>

      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
              <th className="p-4">Amount</th>
              <th className="p-4">Provider</th>
              <th className="p-4">Status</th>
              <th className="p-4">pawaPay</th>
              <th className="p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id} className="border-b border-gray-100">
                <td className="p-4 font-medium">{tx.amount.toLocaleString()} XAF</td>
                <td className="p-4 text-sm">{tx.provider || "—"}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[tx.status] || "bg-gray-100"}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="p-4 text-sm">{tx.pawapay_status || "—"}</td>
                <td className="p-4 text-sm text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {txs.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-500 py-12">No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
