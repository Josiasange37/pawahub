import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { getToken, getSme } from "../lib/api";
import { showToast } from "../components/Toast";
import { MessageCircle, CheckCircle2, XCircle, RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/router";

const getBotUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") return "http://localhost:3001";
  return process.env.NEXT_PUBLIC_BOT_URL || "https://zooming-bravery-production-f6f7.up.railway.app";
};

interface BotStatus {
  connected: boolean;
  qr_data_url: string | null;
  user: string | null;
}

export default function WhatsAppPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [sme, setSme] = useState<any>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const t = getToken();
    const s = getSme();
    setToken(t);
    setSme(s);
    if (!t) router.push("/login");
  }, []);

  const checkBotStatus = useCallback(async () => {
    try {
      const botUrl = getBotUrl();
      const smeId = sme?.id;
      if (!smeId) return;
      const res = await fetch(`${botUrl}/status?sme_id=${smeId}`);
      const data = await res.json();
      if (data.connected) {
        setBotStatus({ connected: true, qr_data_url: null, user: data.user });
      } else {
        const qrRes = await fetch(`${botUrl}/qr-json?sme_id=${smeId}`);
        const qrData = await qrRes.json();
        setBotStatus(qrData);
      }
    } catch {
      setBotStatus({ connected: false, qr_data_url: null, user: null });
    }
  }, [sme]);

  useEffect(() => {
    if (!sme?.id) return;
    checkBotStatus().then(() => setLoading(false));
    const interval = setInterval(checkBotStatus, 4000);
    return () => clearInterval(interval);
  }, [checkBotStatus, sme?.id]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const botUrl = getBotUrl();
      await fetch(`${botUrl}/disconnect?sme_id=${sme?.id}`, { method: "POST" });
      setBotStatus({ connected: false, qr_data_url: null, user: null });
      showToast("WhatsApp disconnected", "success");
    } catch {
      showToast("Failed to disconnect", "error");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    checkBotStatus().finally(() => setLoading(false));
  };

  return (
    <>
      <Head><title>Fluxpay — WhatsApp</title></Head>
      <div className="p-6 space-y-6 bg-[#f5f5f7] min-h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage your WhatsApp connection</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-6">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${
              botStatus?.connected ? "bg-emerald-50 text-emerald-500" : "bg-gray-50 text-gray-400"
            }`}>
              <MessageCircle className="w-8 h-8" />
            </div>

            {loading ? (
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-semibold">Loading WhatsApp status...</p>
              </div>
            ) : botStatus?.connected ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected
                </div>
                {botStatus.user && (
                  <p className="text-gray-500 text-sm">
                    Connected as <span className="font-semibold text-gray-800">{botStatus.user}</span>
                  </p>
                )}
                <p className="text-gray-400 text-xs max-w-sm mx-auto">
                  Your customers will receive payment receipts and notifications on WhatsApp.
                </p>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="mt-4 px-6 py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-sm font-bold transition flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  {disconnecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <XCircle className="w-4 h-4" />
                  Disconnect WhatsApp
                </button>
              </div>
            ) : botStatus?.qr_data_url ? (
              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-800">Scan to Connect</p>
                <div className="bg-white p-3 rounded-2xl inline-block border border-gray-100 shadow-sm">
                  <img src={botStatus.qr_data_url} alt="WhatsApp QR Code" className="w-44 h-44 rounded-xl" />
                </div>
                <p className="text-gray-400 text-xs max-w-xs mx-auto leading-relaxed">
                  Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-400 rounded-full text-sm font-bold">
                  <XCircle className="w-4 h-4" />
                  Disconnected
                </div>
                <p className="text-gray-400 text-xs max-w-sm mx-auto">
                  Could not reach the WhatsApp service. QR code will appear once the bot is ready.
                </p>
                <button
                  onClick={handleRefresh}
                  className="px-6 py-3 bg-[#8B5CF6] text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
