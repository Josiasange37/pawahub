import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";
import { SkeletonTable } from "../components/Skeleton";
import { showToast } from "../components/Toast";

interface Subscriber {
  id: string;
  name: string;
  phone: string;
  email: string;
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

export default function Subscribers() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ plan_id: "", name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [charging, setCharging] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      api("/api/subscribers", { token }),
      api("/api/plans", { token }),
    ])
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
      setForm({ plan_id: "", name: "", phone: "", email: "" });
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
      await api(`/api/subscribers/${id}`, { method: "DELETE", token: getToken()! });
      showToast("Subscriber deactivated", "success");
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const chargeNow = async (id: string) => {
    setCharging(id);
    try {
      const res = await api(`/api/billing/charge/${id}`, { method: "POST", token: getToken()! });
      showToast(`${res.amount.toLocaleString()} XAF payment initiated`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setCharging(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subscribers</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
          {showForm ? "Cancel" : "+ Add Subscriber"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addSub} className="bg-white p-6 rounded-xl border border-gray-200 mb-6 shadow-sm">
          <h3 className="font-semibold mb-4">Add New Subscriber</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
            <input placeholder="Phone (237xxxxxxxxx)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
            <input type="email" placeholder="Email (for receipt)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required>
              <option value="">Select Plan</option>
              {plans.filter((p) => p.is_active !== false).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.amount.toLocaleString()} XAF)</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 transition">
              {saving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
              {saving ? "Adding..." : "Add Subscriber"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">Cancel</button>
          </div>
        </form>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-semibold text-lg mb-2">Deactivate Subscriber?</h3>
            <p className="text-gray-500 text-sm mb-6">This subscriber will stop receiving payment notifications.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">Cancel</button>
              <button onClick={() => deactivate(confirmDelete)} className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 transition">Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={5} />
      ) : subs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👥</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No subscribers yet</h3>
          <p className="text-gray-500 text-sm mb-4">Add your first subscriber to start collecting payments.</p>
          <button onClick={() => setShowForm(true)} className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
            Add Your First Subscriber
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          {subs.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold text-sm">
                  {sub.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{sub.name}</p>
                  <p className="text-sm text-gray-500">{sub.phone}</p>
                  {sub.email && <p className="text-xs text-gray-400">{sub.email}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full ${sub.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {sub.is_active ? "Active" : "Inactive"}
                </span>
                {sub.is_active && (
                  <>
                    <button
                      onClick={() => chargeNow(sub.id)}
                      disabled={charging === sub.id}
                      className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1 transition"
                    >
                      {charging === sub.id && <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />}
                      {charging === sub.id ? "Charging..." : "Charge Now"}
                    </button>
                    <button onClick={() => setConfirmDelete(sub.id)} className="text-xs text-red-500 hover:text-red-700 transition">Deactivate</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
