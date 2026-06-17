import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api, getToken, removeToken } from "../lib/api";
import { showToast } from "../components/Toast";
import { Users, Plus, X, Search, Zap, UserX, Trash2, AlertTriangle, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";

interface Subscriber {
  id: string;
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
  plan_id: string;
  is_active: boolean;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  amount: number;
  is_active?: boolean;
}

const inputCls = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] transition placeholder:text-gray-400";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
      active ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"
    }`}>
      {active ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function Subscribers() {
  const router = useRouter();
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ plan_id: "", name: "", phone: "", email: "", whatsapp: "" });
  const [saving, setSaving] = useState(false);
  const [charging, setCharging] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    setLoading(true);
    Promise.all([api("/api/subscribers", { token }), api("/api/plans", { token })])
      .then(([s, p]) => { setSubs(s); setPlans(p); })
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const addSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/subscribers", { method: "POST", token: getToken()!, body: form });
      setForm({ plan_id: "", name: "", phone: "", email: "", whatsapp: "" });
      setShowForm(false);
      showToast("Subscriber added successfully", "success");
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    try {
      await api(`/api/subscribers/${id}/soft`, { method: "DELETE", token: getToken()! });
      showToast("Subscriber deactivated", "success");
      setConfirmDeactivate(null);
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const deleteSub = async (id: string) => {
    try {
      await api(`/api/subscribers/${id}`, { method: "DELETE", token: getToken()! });
      showToast("Subscriber deleted permanently", "success");
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const clearAll = async () => {
    setClearing(true);
    try {
      await api("/api/subscribers/all", { method: "DELETE", token: getToken()! });
      showToast("All subscribers cleared", "success");
      setConfirmClearAll(false);
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setClearing(false);
    }
  };

  const chargeNow = async (id: string) => {
    setCharging(id);
    try {
    const res = await api(`/api/billing/charge/${id}`, { method: "POST", token: getToken()! });
    showToast(`${res.amount.toLocaleString()} XAF - ${res.status || "processing"}`, res.status === "failed" ? "error" : "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setCharging(null);
    }
  };

  const filtered = subs.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const planMap = Object.fromEntries(plans.map(p => [p.id, p]));

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Confirm Deactivate Modal */}
      {confirmDeactivate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
              <UserX className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Deactivate Subscriber?</h3>
            <p className="text-gray-500 text-sm mb-6">This subscriber will stop receiving payment notifications.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeactivate(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>
              <button onClick={() => deactivate(confirmDeactivate)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition">Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Hard Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Delete Subscriber?</h3>
            <p className="text-gray-500 text-sm mb-6">This will permanently delete this subscriber and all their payment history.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>
              <button onClick={() => deleteSub(confirmDelete)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear All Modal */}
      {confirmClearAll && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Clear All Subscribers?</h3>
            <p className="text-gray-500 text-sm mb-6">This will permanently delete all subscribers and their payment history. This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmClearAll(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>
              <button onClick={clearAll} disabled={clearing} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition">
                {clearing ? "Clearing..." : "Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Subscribers</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{subs.length} total · {subs.filter(s => s.is_active).length} active</p>
        </div>
        <div className="flex items-center gap-2">
          {subs.length > 0 && (
            <button
              onClick={() => setConfirmClearAll(true)}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition border border-red-200 text-red-500 hover:bg-red-50 whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shadow-md whitespace-nowrap ${
              showForm ? "bg-gray-100 text-gray-700" : "bg-[#8B5CF6] text-white hover:bg-purple-600 shadow-purple-200"
            }`}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Add Subscriber"}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-5">Add New Subscriber</h3>
          <form onSubmit={addSub} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name</label>
                <input className={inputCls} placeholder="e.g. Amina Diallo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Phone (237xxxxxxxxx)</label>
                <input className={inputCls} placeholder="237650000000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email (optional)</label>
                <input className={inputCls} type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">WhatsApp Number</label>
                <input className={inputCls} placeholder="237650000000" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Subscription Plan</label>
                <div className="relative">
                  <select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })} className={`${inputCls} pr-10 appearance-none`} required>
                    <option value="">Select a plan…</option>
                    {plans.filter(p => p.is_active !== false).map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.amount.toLocaleString()} XAF</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#8B5CF6] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 transition">
                {saving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {saving ? "Adding…" : "Add Subscriber"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">All Subscribers</h2>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              className="text-xs sm:text-sm bg-transparent outline-none placeholder:text-gray-400 flex-1 min-w-0"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-px">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-50 animate-pulse mx-6 my-2 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-[#8B5CF6]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{search ? "No results" : "No subscribers yet"}</h3>
            <p className="text-gray-400 text-sm mb-5">{search ? "Try a different search term." : "Add your first subscriber to start collecting payments."}</p>
            {!search && (
              <button onClick={() => setShowForm(true)} className="bg-[#8B5CF6] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-600 transition">
                Add First Subscriber
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 font-semibold border-b border-gray-100">
                  <th className="text-left px-2 sm:px-3 py-3">Subscriber</th>
                  <th className="text-left px-2 sm:px-3 py-3 hidden md:table-cell">Phone</th>
                  <th className="text-left px-2 sm:px-3 py-3 hidden lg:table-cell">Plan</th>
                  <th className="text-left px-2 sm:px-3 py-3">Status</th>
                  <th className="text-right px-3 sm:px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-2 sm:px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#10B981] flex items-center justify-center text-white text-[10px] sm:text-xs font-bold shrink-0">
                          {sub.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{sub.name}</p>
                          {sub.email && <p className="text-[10px] text-gray-400 truncate">{sub.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">{sub.phone}</td>
                    <td className="px-2 sm:px-3 py-3 hidden lg:table-cell">
                      {planMap[sub.plan_id] ? (
                        <span className="text-xs bg-purple-50 text-[#8B5CF6] font-semibold px-2 py-0.5 rounded-lg">
                          {planMap[sub.plan_id].name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-2 sm:px-3 py-3"><StatusBadge active={sub.is_active} /></td>
                    <td className="px-3 sm:px-6 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {sub.is_active && (
                          <button
                            onClick={() => chargeNow(sub.id)}
                            disabled={charging === sub.id}
                            className="flex items-center gap-1 text-[10px] sm:text-xs bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition whitespace-nowrap"
                          >
                            {charging === sub.id
                              ? <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                              : <Zap className="w-3 h-3" />
                            }
                            {charging === sub.id ? "Charging…" : "Charge"}
                          </button>
                        )}
                        {sub.is_active && (
                          <button
                            onClick={() => setConfirmDeactivate(sub.id)}
                            className="text-[10px] sm:text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition whitespace-nowrap"
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(sub.id)}
                          className="text-[10px] sm:text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition whitespace-nowrap"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
