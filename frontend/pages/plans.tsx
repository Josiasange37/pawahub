import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";
import { SkeletonCards } from "../components/Skeleton";
import { showToast } from "../components/Toast";

interface Plan {
  id: string;
  name: string;
  description: string;
  amount: number;
  interval_days: number;
  is_active: boolean;
  created_at: string;
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", amount: "", interval_days: "30" });
  const [saving, setSaving] = useState(false);

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
          {showForm ? "Cancel" : "+ New Plan"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPlan} className="bg-white p-6 rounded-xl border border-gray-200 mb-6 shadow-sm">
          <h3 className="font-semibold mb-4">Create New Plan</h3>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Plan Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
            <input placeholder="Amount (XAF)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 col-span-2" />
            <input placeholder="Interval (days)" type="number" value={form.interval_days} onChange={(e) => setForm({ ...form, interval_days: e.target.value })} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 transition">
              {saving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
              {saving ? "Creating..." : "Create Plan"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <SkeletonCards count={6} />
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No plans yet</h3>
          <p className="text-gray-500 text-sm mb-4">Create your first subscription plan to start collecting payments.</p>
          <button onClick={() => setShowForm(true)} className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition">
            Create Your First Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${plan.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {plan.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              {plan.description && <p className="text-gray-500 text-sm mt-1">{plan.description}</p>}
              <p className="text-2xl font-bold mt-3">{plan.amount.toLocaleString()} <span className="text-sm font-normal text-gray-500">XAF</span></p>
              <p className="text-sm text-gray-500 mt-1">Every {plan.interval_days} days</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
