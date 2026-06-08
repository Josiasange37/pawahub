import { useState } from "react";
import { useRouter } from "next/router";
import { api, setToken, setSme } from "../lib/api";

export default function Login() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", business_name: "", phone: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister ? form : { email: form.email, password: form.password };
      const data = await api(endpoint, { method: "POST", body });
      setToken(data.access_token);
      setSme(data.sme);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-bold text-center mb-2">PawaSub</h1>
      <p className="text-gray-500 text-center mb-8">Subscription payments via Mobile Money</p>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-6">{isRegister ? "Create Account" : "Sign In"}</h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />

        {isRegister && (
          <>
            <input
              type="text"
              placeholder="Business Name"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <input
              type="tel"
              placeholder="Phone (e.g. 237653456789)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </>
        )}

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />

        <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700">
          {isRegister ? "Register" : "Sign In"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-primary-600 hover:underline">
            {isRegister ? "Sign In" : "Register"}
          </button>
        </p>
      </form>
    </div>
  );
}
