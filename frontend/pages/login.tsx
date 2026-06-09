import { useState } from "react";
import { useRouter } from "next/router";
import { api, setToken, setSme } from "../lib/api";

export default function Login() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", business_name: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister ? form : { email: form.email, password: form.password };
      const data = await api(endpoint, { method: "POST", body });
      setToken(data.access_token);
      setSme(data.sme);

      if (isRegister) {
        router.push("/onboarding");
      } else {
        // Check if onboarding is complete
        try {
          const prefs = await api("/api/preferences", { token: data.access_token });
          if (!prefs.onboarding_complete) {
            router.push("/onboarding");
          } else {
            router.push("/");
          }
        } catch {
          router.push("/onboarding");
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">PawaSub</h1>
          <p className="text-gray-500 mt-2">Subscription payments via Mobile Money</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-6">{isRegister ? "Create Account" : "Sign In"}</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />

            {isRegister && (
              <>
                <input
                  type="text"
                  placeholder="Business Name"
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone (e.g. 237681752094)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </>
            )}

            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 mt-6 flex items-center justify-center gap-2"
          >
            {loading && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
            {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-primary-600 hover:underline font-medium">
              {isRegister ? "Sign In" : "Register"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
