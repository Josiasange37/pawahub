import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { api, getToken, removeToken, getSme } from "../lib/api";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [useCase, setUseCase] = useState<string>("subscriptions");
  const token = mounted ? getToken() : null;
  const sme = mounted ? getSme() : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && token) {
      api("/api/preferences", { token })
        .then((prefs) => {
          setUseCase(prefs.use_case || "subscriptions");
          if (!prefs.onboarding_complete && router.pathname !== "/onboarding") {
            router.push("/onboarding");
          }
        })
        .catch(() => {});
    }
  }, [mounted, token]);

  useEffect(() => {
    if (mounted && !token && router.pathname !== "/login") {
      router.push("/login");
    }
  }, [mounted, token]);

  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  const isSalesMode = useCase === "sales";

  const nav = isSalesMode
    ? [
        { label: "Dashboard", href: "/", icon: "📊" },
        { label: "Point of Sale", href: "/pos", icon: "🛒" },
        { label: "Products", href: "/pos?tab=products", icon: "📦" },
        { label: "Sales History", href: "/pos?tab=history", icon: "📋" },
        { label: "WhatsApp", href: "/onboarding", icon: "💬" },
      ]
    : [
        { label: "Dashboard", href: "/", icon: "📊" },
        { label: "Plans", href: "/plans", icon: "📋" },
        { label: "Subscribers", href: "/subscribers", icon: "👥" },
        { label: "Transactions", href: "/transactions", icon: "💸" },
        { label: "WhatsApp", href: "/onboarding", icon: "💬" },
      ];

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  if (router.pathname === "/login" || router.pathname === "/onboarding") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-primary-700">PawaSub</h1>
          {sme && <p className="text-sm text-gray-500 mt-1">{sme.business_name}</p>}
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 mt-2 inline-block">
            {isSalesMode ? "🛒 Sales Mode" : "🔄 Subscription Mode"}
          </span>
        </div>

        <nav className="space-y-1 flex-1">
          {nav.map((item) => {
            const isActive = router.pathname === item.href || router.asPath === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={() => router.push("/onboarding")}
            className="w-full text-left px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition mb-2"
          >
            ⚙️ Settings
          </button>
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition">
            🚪 Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
