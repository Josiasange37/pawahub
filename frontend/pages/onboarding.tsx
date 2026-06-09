import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { api, getToken, getSme, setSme } from "../lib/api";
import { showToast } from "../components/Toast";

const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL || "https://zooming-bravery-production-f6f7.up.railway.app";

interface BotStatus {
  connected: boolean;
  qr_data_url: string | null;
  user: string | null;
}

const STEPS = ["business_type", "use_case", "whatsapp"];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState("");
  const [useCase, setUseCase] = useState("");
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sme = getSme();

  const checkBotStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BOT_URL}/status`);
      const data = await res.json();
      if (data.connected) {
        setBotStatus({ connected: true, qr_data_url: null, user: data.user });
        return true;
      }
      const qrRes = await fetch(`${BOT_URL}/qr-json`);
      const qrData = await qrRes.json();
      setBotStatus(qrData);
      return qrData.connected;
    } catch {
      setBotStatus({ connected: false, qr_data_url: null, user: null });
      return false;
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    checkBotStatus().then(() => setLoading(false));
    const interval = setInterval(async () => {
      const connected = await checkBotStatus();
      if (connected) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [checkBotStatus, router]);

  const handleComplete = async () => {
    setSaving(true);
    try {
      const token = getToken()!;
      await api("/api/preferences", {
        method: "POST",
        token,
        body: { business_type: businessType, use_case: useCase },
      });
      showToast("Account configured successfully!", "success");
      router.push("/");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to PawaSub</h1>
          {sme && <p className="text-gray-500">Setting up {sme.business_name}</p>}
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  i < step ? "bg-primary-600 text-white" : i === step ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`text-xs ${i === step ? "text-primary-700 font-medium" : "text-gray-400"}`}>
                  {s === "business_type" ? "Business" : s === "use_case" ? "Purpose" : "WhatsApp"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Step 1: Business Type */}
          {step === 0 && (
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏪</span>
                </div>
                <h2 className="text-xl font-semibold">What type of business do you run?</h2>
                <p className="text-gray-500 text-sm mt-1">This helps us customize your experience</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setBusinessType("solo")}
                  className={`w-full p-5 rounded-xl border-2 text-left transition ${
                    businessType === "solo" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <span className="text-xl">👤</span>
                    </div>
                    <div>
                      <p className="font-semibold">Solo Business</p>
                      <p className="text-sm text-gray-500">I run my business alone or with a small team</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setBusinessType("enterprise")}
                  className={`w-full p-5 rounded-xl border-2 text-left transition ${
                    businessType === "enterprise" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <span className="text-xl">🏢</span>
                    </div>
                    <div>
                      <p className="font-semibold">Enterprise</p>
                      <p className="text-sm text-gray-500">I have a team and need advanced features</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Use Case */}
          {step === 1 && (
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h2 className="text-xl font-semibold">How will you use PawaSub?</h2>
                <p className="text-gray-500 text-sm mt-1">Choose what fits your business needs</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setUseCase("subscriptions")}
                  className={`w-full p-5 rounded-xl border-2 text-left transition ${
                    useCase === "subscriptions" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <span className="text-xl">🔄</span>
                    </div>
                    <div>
                      <p className="font-semibold">Manage Subscriptions</p>
                      <p className="text-sm text-gray-500">Collect monthly recurring payments from customers</p>
                      <p className="text-xs text-gray-400 mt-1">Perfect for gyms, schools, SaaS, memberships</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setUseCase("sales")}
                  className={`w-full p-5 rounded-xl border-2 text-left transition ${
                    useCase === "sales" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <span className="text-xl">🛒</span>
                    </div>
                    <div>
                      <p className="font-semibold">Manage Product Sales</p>
                      <p className="text-sm text-gray-500">Register products and accept one-time payments</p>
                      <p className="text-xs text-gray-400 mt-1">Perfect for shops, restaurants, freelancers</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: WhatsApp */}
          {step === 2 && (
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h2 className="text-xl font-semibold">Connect WhatsApp</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Send receipts and payment notifications to your customers
                </p>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500 text-sm">Connecting to bot...</p>
                </div>
              ) : botStatus?.connected ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✅</span>
                  </div>
                  <h3 className="text-lg font-semibold text-green-700 mb-1">WhatsApp Connected!</h3>
                  <p className="text-gray-500 text-sm">Your customers will receive receipts on WhatsApp.</p>
                </div>
              ) : botStatus?.qr_data_url ? (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 inline-block mb-4">
                    <img src={botStatus.qr_data_url} alt="WhatsApp QR Code" className="w-56 h-56" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    Open WhatsApp → <strong>Settings</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong>
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500 text-sm">Waiting for QR code...</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Back
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={(step === 0 && !businessType) || (step === 1 && !useCase)}
                className="flex-1 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {saving ? "Setting up..." : "Complete Setup"}
              </button>
            )}

            {step === STEPS.length - 1 && (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          You can change these settings anytime from your dashboard.
        </p>
      </div>
    </div>
  );
}
