import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { api, getToken, removeToken, getSme, getPreferencesFallback } from "../lib/api";
import {
  LayoutDashboard, ShoppingCart, Package, History, MessageCircle,
  Users, FileText, CreditCard, Settings, LogOut, Bell, ChevronDown,
  Zap, Menu, X
} from "lucide-react";

const getBotUrl = () => {
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost") return "http://localhost:3001";
  }
  return process.env.NEXT_PUBLIC_BOT_URL || "https://zooming-bravery-production-f6f7.up.railway.app";
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [useCase, setUseCase] = useState<string>("subscriptions");
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const token = mounted ? getToken() : null;
  const sme = mounted ? getSme() : null;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && token && sme) {
      api("/api/preferences", { token })
        .then((prefs) => {
          const localPrefs = getPreferencesFallback(sme.id);
          const finalPrefs = prefs?.onboarding_complete ? prefs : (localPrefs?.onboarding_complete ? localPrefs : prefs);
          setUseCase(finalPrefs?.use_case || "subscriptions");
          if (!finalPrefs?.onboarding_complete && router.pathname !== "/onboarding") {
            router.push("/onboarding");
          }
        })
        .catch(() => {
          const localPrefs = sme ? getPreferencesFallback(sme.id) : null;
          if (localPrefs) {
            setUseCase(localPrefs.use_case || "subscriptions");
            if (!localPrefs.onboarding_complete && router.pathname !== "/onboarding") router.push("/onboarding");
          } else if (router.pathname !== "/onboarding") {
            router.push("/onboarding");
          }
        });
    }
  }, [mounted, token, sme?.id]);

  useEffect(() => {
    if (mounted && !token && router.pathname !== "/login") router.push("/login");
  }, [mounted, token]);

  useEffect(() => {
    if (!token) return;
    const check = async () => {
      try {
        const res = await fetch(`${getBotUrl()}/status`);
        const data = await res.json();
        setWhatsappConnected(!!data.connected);
      } catch { setWhatsappConnected(false); }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [token]);

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
      <div className="w-8 h-8 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (router.pathname === "/login" || router.pathname === "/onboarding") {
    return <>{children}</>;
  }

  const isSales = useCase === "sales";

  const navItems = isSales
    ? [
        { label: "Dashboard",    href: "/",                    icon: LayoutDashboard },
        { label: "Point of Sale",href: "/pos",                 icon: ShoppingCart },
        { label: "Products",     href: "/products",            icon: Package },
        { label: "Sales History",href: "/sales",               icon: History },
        { label: "WhatsApp",     href: "/whatsapp",            icon: MessageCircle, dot: whatsappConnected },
      ]
    : [
        { label: "Dashboard",    href: "/",                    icon: LayoutDashboard },
        { label: "Plans",        href: "/plans",               icon: FileText },
        { label: "Subscribers",  href: "/subscribers",         icon: Users },
        { label: "Transactions", href: "/transactions",        icon: CreditCard },
        { label: "WhatsApp",     href: "/whatsapp",            icon: MessageCircle, dot: whatsappConnected },
      ];

  const handleLogout = () => { removeToken(); router.push("/login"); };
  const initials = sme?.business_name ? sme.business_name.slice(0, 2).toUpperCase() : "FP";

  const Sidebar = () => (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#8B5CF6] flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">
          <span className="text-gray-900">Flux</span>
          <span className="text-[#8B5CF6]">pay</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 mt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.href || router.asPath === item.href;
          return (
            <button
              key={item.href}
              onClick={() => { router.push(item.href); setSidebarOpen(false); }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-3 group ${
                isActive
                  ? "bg-[#8B5CF6] text-white shadow-md shadow-purple-200"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.label === "WhatsApp" && item.dot !== null && (
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.dot ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-6 mt-4 space-y-0.5 border-t border-gray-100 pt-4">
        <button
          onClick={() => router.push("/settings")}
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition flex items-center gap-3"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 transition flex items-center gap-3"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-[#f5f5f7]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 z-30">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-64 bg-white h-full z-50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            {/* Mobile menu */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Nav tabs (desktop) */}
            <nav className="hidden lg:flex items-center gap-1">
              {[
                { label: "Dashboard", href: "/" },
                { label: "Analytics", href: "#" },
                { label: "Reports", href: "#" },
              ].map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => tab.href !== "#" && router.push(tab.href)}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium transition ${
                    router.pathname === tab.href
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Bell */}
            <button className="relative w-9 h-9 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#8B5CF6] rounded-full" />
            </button>

            {/* Settings */}
            <button
              onClick={() => router.push("/settings")}
              className="w-9 h-9 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Profile */}
            <button className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#10B981] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-gray-900 leading-tight">{sme?.business_name || "Fluxpay"}</p>
                <p className="text-[10px] text-gray-400">{isSales ? "Sales mode" : "Subscriptions"}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
