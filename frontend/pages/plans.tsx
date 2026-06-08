import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";

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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", amount: "", interval_days: "30" });

  const load = () => api("/api/plans", { token: getToken()! }).then(setPlans);

  useEffect(() => { load(); }, []);

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/api/plans", {
      method: "POST",
      token: getToken()!,
      body: { name: form.name, description: form.description, amount: parseInt(form.amount), interval_days: parseInt(form.interval_days) },
    });
    setForm({ name: "", description: "", amount: "", interval_days: "30" });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          {showForm ? "Cancel" : "New Plan"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPlan} className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Plan Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2 border rounded-lg" required />
            <input placeholder="Amount (XAF)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="px-4 py-2 border rounded-lg" required />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="px-4 py-2 border rounded-lg col-span-2" />
            <input placeholder="Interval (days)" type="number" value={form.interval_days} onChange={(e) => setForm({ ...form, interval_days: e.target.value })} className="px-4 py-2 border rounded-lg" />
          </div>
          <button type="submit" className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-primary-700">Create Plan</button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-lg">{plan.name}</h3>
            {plan.description && <p className="text-gray-500 text-sm mt-1">{plan.description}</p>}
            <p className="text-2xl font-bold mt-3">{plan.amount.toLocaleString()} <span className="text-sm font-normal text-gray-500">XAF</span></p>
            <p className="text-sm text-gray-500 mt-1">Every {plan.interval_days} days</p>
            <span className={`inline-block mt-3 text-xs px-2 py-1 rounded-full ${plan.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {plan.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        ))}
        {plans.length === 0 && <p className="col-span-3 text-gray-500 text-center py-12">No plans yet. Create your first plan.</p>}
      </div>
    </div>
  );
}
