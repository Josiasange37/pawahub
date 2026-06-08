import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getToken, removeToken, getSme } from "../lib/api";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const token = mounted ? getToken() : null;
  const sme = mounted ? getSme() : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token && router.pathname !== "/login") {
      router.push("/login");
    }
  }, [mounted, token]);

  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  const nav = [
    { label: "Dashboard", href: "/" },
    { label: "Plans", href: "/plans" },
    { label: "Subscribers", href: "/subscribers" },
    { label: "Transactions", href: "/transactions" },
  ];

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  if (router.pathname === "/login") {
    return <main className="min-h-screen flex items-center justify-center p-8">{children}</main>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-gray-200 p-6">
        <h1 className="text-xl font-bold text-primary-700 mb-8">PawaSub</h1>
        {sme && <p className="text-sm text-gray-500 mb-6">{sme.business_name}</p>}
        <nav className="space-y-2">
          {nav.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition ${
                router.pathname === item.href ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="mt-8 text-sm text-red-500 hover:text-red-700">Logout</button>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
