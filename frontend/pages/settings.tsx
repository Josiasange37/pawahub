import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { api, getToken, getSme, removeToken } from "../lib/api";
import { showToast } from "../components/Toast";
import { Settings as SettingsIcon, User, Building2, Smartphone, Mail, Save, Trash2, AlertTriangle, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [sme, setSme] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    const t = getToken();
    const s = getSme();
    if (!t) { router.push("/login"); return; }
    setToken(t);
    setSme(s);
    if (s) {
      setBusinessName(s.business_name || "");
      setPhone(s.phone || "");
      setEmail(s.email || "");
    }
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api("/api/auth/me", {
        method: "PUT",
        token: token!,
        body: { business_name: businessName, phone, email },
      });
      setSme(res);
      showToast("Account updated", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await fetch(`https://pawahub-production.up.railway.app/api/auth/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      removeToken();
      showToast("Account deleted", "success");
      router.push("/login");
    } catch {
      showToast("Failed to delete account", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-xl mb-8" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <Head><title>Fluxpay — Settings</title></Head>
      <div className="p-4 sm:p-6 space-y-6 bg-[#f5f5f7] min-h-full">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Manage your account</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#10B981] flex items-center justify-center text-white text-lg font-bold shrink-0">
                {(sme?.business_name || "FP").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{sme?.business_name || "Fluxpay"}</h2>
                <p className="text-sm text-gray-400">{sme?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-1.5">
                  <Building2 className="w-4 h-4" /> Business Name
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-1.5">
                  <Smartphone className="w-4 h-4" /> Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-1.5">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#8B5CF6] text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>

          {/* Subscription Info Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Plan & Billing
            </h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Plan</span>
                <span className="font-semibold text-gray-800">Free — Beta</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className="font-semibold text-emerald-600">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Registered</span>
                <span className="font-semibold text-gray-800">
                  {sme?.created_at ? new Date(sme.created_at).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
            <h2 className="text-base font-bold text-red-500 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h2>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-500 rounded-xl text-sm font-bold hover:bg-red-100 transition"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            ) : (
              <div className="space-y-4 bg-red-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-600">
                  This will permanently delete your account and all associated data (subscribers, transactions, products, etc.).
                </p>
                <p className="text-xs text-red-400">
                  Type <span className="font-bold">DELETE</span> to confirm:
                </p>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='Type "DELETE"'
                  className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== "DELETE" || deleting}
                    className="flex items-center gap-2 px-5 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Trash2 className="w-4 h-4" />
                    Permanently Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
