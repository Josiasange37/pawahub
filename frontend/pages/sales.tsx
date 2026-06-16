import { useEffect, useState } from "react";
import { api, getToken, API_BASE } from "../lib/api";
import { showToast } from "../components/Toast";
import {
  History,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  Share2
} from "lucide-react";

interface Sale {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  receipt_number: string;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    completed: { cls: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: <CheckCircle className="w-3 h-3" /> },
    pending:   { cls: "bg-yellow-50 text-yellow-600 border border-yellow-200",   icon: <Clock className="w-3 h-3" /> },
    failed:    { cls: "bg-red-50 text-red-500 border border-red-200",             icon: <XCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? { cls: "bg-gray-100 text-gray-500 border border-gray-200", icon: <AlertCircle className="w-3 h-3" /> };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
      {s.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadSales = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api("/api/pos/sales", { token });
      setSales(data);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSales(); }, []);

  const downloadReceipt = async (saleId: string) => {
    const token = getToken()!;
    window.open(`${API_BASE}/api/pos/sales/${saleId}/receipt-pdf?token=${token}`, "_blank");
  };

  const sendReceipt = async (saleId: string, channel: string) => {
    try {
      await api(`/api/pos/sales/${saleId}/send-receipt?channel=${channel}`, { method: "POST", token: getToken()! });
      showToast(`Receipt sent via ${channel}`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const filtered = sales.filter(s => 
    (s.customer_name || "").toLowerCase().includes(search.toLowerCase()) || 
    s.customer_phone.includes(search) || 
    s.receipt_number.includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
          <p className="text-sm text-gray-400 mt-0.5">View and manage all past Mobile Money checkout transactions</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5 w-72 shadow-sm">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            className="text-sm bg-transparent outline-none placeholder:text-gray-400 w-full"
            placeholder="Search by customer or receipt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <History className="w-7 h-7 text-[#8B5CF6]" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{search ? "No matching records" : "No sales history"}</h3>
          <p className="text-gray-400 text-sm">Transactions will appear here once you check out orders via MoMo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sale) => (
            <div key={sale.id} className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-bold text-gray-950">{sale.customer_name || "Guest Customer"}</p>
                  <span className="text-xs font-semibold text-gray-400 font-mono">{sale.customer_phone}</span>
                  <PaymentStatusBadge status={sale.payment_status} />
                </div>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {sale.items.map((i) => `${i.product_name} (x${i.quantity})`).join(", ")}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>Receipt: <span className="font-bold text-gray-500">{sale.receipt_number}</span></span>
                  <span>•</span>
                  <span>{new Date(sale.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-5 justify-between md:justify-end shrink-0 pt-3 md:pt-0 border-t border-gray-50 md:border-0">
                <div className="md:text-right">
                  <p className="text-xl font-extrabold text-gray-900">{sale.total_amount.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">XAF Total</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => downloadReceipt(sale.id)}
                    className="p-2.5 text-gray-500 hover:text-[#8B5CF6] hover:bg-purple-50 rounded-xl transition"
                    title="Download PDF Receipt"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => sendReceipt(sale.id, "whatsapp")}
                    className="p-2.5 text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition"
                    title="Send Receipt via WhatsApp"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
