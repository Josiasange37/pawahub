import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";
import { showToast } from "../components/Toast";
import { FileText, Plus, X, Clock, CheckCircle, AlertCircle, Search } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string;
  amount: number;
  interval_days: number;
  is_active: boolean;
  created_at: string;
}

const inputCls = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] transition placeholder:text-gray-400";

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", amount: "", interval_days: "30" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    api("/api/plans", { token })
      .then(setPlans)
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/plans", {
        method: "POST",
        token: getToken()!,
        body: { name: form.name, description: form.description, amount: parseInt(form.amount), interval_days: parseInt(form.interval_days) },
      });
      setForm({ name: "", description: "", amount: "", interval_days: "30" });
      setShowForm(false);
      showToast("Plan created successfully", "success");
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = plans.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your recurring payment plans</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-md ${
            showForm ? "bg-gray-100 text-gray-700" : "bg-[#8B5CF6] text-white hover:bg-purple-600 shadow-purple-200"
          }`}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "New Plan"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-5">Create New Plan</h3>
          <form onSubmit={createPlan} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Plan Name</label>
                <input className={inputCls} placeholder="e.g. Monthly Basic" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Amount (XAF)</label>
                <input className={inputCls} type="number" placeholder="e.g. 5000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
                <input className={inputCls} placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Billing Interval (days)</label>
                <input className={inputCls} type="number" placeholder="30" value={form.interval_days} onChange={(e) => setForm({ ...form, interval_days: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#8B5CF6] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 transition">
                {saving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {saving ? "Creating…" : "Create Plan"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 w-72 shadow-sm">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          className="text-sm bg-transparent outline-none placeholder:text-gray-400 flex-1"
          placeholder="Search plans…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-44 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-[#8B5CF6]" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{search ? "No plans found" : "No plans yet"}</h3>
          <p className="text-gray-400 text-sm mb-5">{search ? "Try a different search term." : "Create your first subscription plan to start collecting payments."}</p>
          {!search && (
            <button onClick={() => setShowForm(true)} className="bg-[#8B5CF6] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-600 transition">
              Create First Plan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#8B5CF6]" />
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  plan.is_active ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-gray-100 text-gray-500"
                }`}>
                  {plan.is_active ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {plan.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1">{plan.name}</h3>
              {plan.description && <p className="text-gray-400 text-sm mb-3 leading-relaxed">{plan.description}</p>}
              <div className="pt-4 border-t border-gray-100 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{plan.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">XAF / plan</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl">
                  <Clock className="w-3.5 h-3.5" />
                  Every {plan.interval_days}d
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
