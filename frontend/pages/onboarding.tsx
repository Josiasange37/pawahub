import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { getToken, getSme } from "../lib/api";

const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL || "https://zooming-bravery-production-f6f7.up.railway.app";

interface BotStatus {
  connected: boolean;
  qr_data_url: string | null;
  user: string | null;
}

export default function Onboarding() {
  const router = useRouter();
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const sme = getSme();

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BOT_URL}/status`);
      const data = await res.json();
      if (data.connected) {
        setStatus({ connected: true, qr_data_url: null, user: data.user });
        return true;
      }
      const qrRes = await fetch(`${BOT_URL}/qr-json`);
      const qrData = await qrRes.json();
      setStatus(qrData);
      return qrData.connected;
    } catch {
      setStatus({ connected: false, qr_data_url: null, user: null });
      return false;
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    checkStatus().then(() => setLoading(false));
    const interval = setInterval(async () => {
      const connected = await checkStatus();
      if (connected) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [checkStatus, router]);

  const skip = () => router.push("/");
  const continueToApp = () => router.push("/");

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to PawaSub</h1>
          {sme && <p className="text-gray-500">Setting up {sme.business_name}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h2 className="text-xl font-semibold">Connect WhatsApp</h2>
            <p className="text-gray-500 text-sm mt-1">
              Scan the QR code to send payment notifications to your customers via WhatsApp
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm">Connecting to bot...</p>
            </div>
          ) : status?.connected ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold text-green-700 mb-1">WhatsApp Connected!</h3>
              <p className="text-gray-500 text-sm">Your customers will receive payment notifications on WhatsApp.</p>
            </div>
          ) : status?.qr_data_url ? (
            <div className="text-center">
              <div className="bg-white p-4 rounded-xl border border-gray-200 inline-block mb-4">
                <img
                  src={status.qr_data_url}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64"
                />
              </div>
              <p className="text-gray-500 text-sm">
                Open WhatsApp on your phone → <strong>Settings</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong>
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm">Waiting for QR code...</p>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={skip}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Skip for now
            </button>
            <button
              onClick={continueToApp}
              className="flex-1 px-6 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {status?.connected ? "Continue" : "Set up later"}
            </button>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          You can connect WhatsApp anytime from the sidebar menu.
        </p>
      </div>
    </div>
  );
}
