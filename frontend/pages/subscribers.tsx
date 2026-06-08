import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";

interface Subscriber {
  id: string;
  name: string;
  phone: string;
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ plan_id: "", name: "", phone: "" });

  const load = () => {
    api("/api/subscribers", { token: getToken()! }).then(setSubs);
    api("/api/plans", { token: getToken()! }).then(setPlans);
  };

  useEffect(() => { load(); }, []);

  const addSub = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/api/subscribers", { method: "POST", token: getToken()!, body: form });
    setForm({ plan_id: "", name: "", phone: "" });
    setShowForm(false);
    load();
  };

  const deactivate = async (id: string) => {
    await api(`/api/subscribers/${id}`, { method: "DELETE", token: getToken()! });
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subscribers</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          {showForm ? "Cancel" : "Add Subscriber"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addSub} className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2 border rounded-lg" required />
            <input placeholder="Phone (237xxxxxxxxx)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-4 py-2 border rounded-lg" required />
            <select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })} className="px-4 py-2 border rounded-lg" required>
              <option value="">Select Plan</option>
              {plans.filter(p => p.is_active !== false).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.amount.toLocaleString()} XAF)</option>
              ))}
            </select>
          </div>
          <button type="submit" className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-primary-700">Add Subscriber</button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {subs.map((sub) => (
          <div key={sub.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0">
            <div>
              <p className="font-medium">{sub.name}</p>
              <p className="text-sm text-gray-500">{sub.phone}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full ${sub.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {sub.is_active ? "Active" : "Inactive"}
              </span>
              {sub.is_active && (
                <button onClick={() => deactivate(sub.id)} className="text-xs text-red-500 hover:text-red-700">Deactivate</button>
              )}
            </div>
          </div>
        ))}
        {subs.length === 0 && <p className="text-gray-500 text-center py-12">No subscribers yet.</p>}
      </div>
    </div>
  );
}
