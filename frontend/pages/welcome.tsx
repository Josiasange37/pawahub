import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getToken } from "../lib/api";
import { ArrowRight, Smartphone, Repeat, Shield, Zap } from "lucide-react";

export default function Welcome() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (getToken()) router.replace("/");
  }, []);

  if (!mounted) return null;
  if (getToken()) return null;

  return (
    <>
      <Head>
        <title>Fluxpay — Mobile Money for Africa</title>
      </Head>
      <div className="min-h-screen bg-white flex flex-col">
        {/* Nav */}
        <nav className="w-full px-6 py-5 flex items-center justify-between">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 225 70" className="h-10 sm:h-12 w-auto">
            <defs>
              <linearGradient id="welcome-logo" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#8B5CF6" />
                <stop offset="100%" stop-color="#10B981" />
              </linearGradient>
            </defs>
            <g transform="translate(5, 0)">
              <path d="M 22,44 C 35,44 40,24 55,24 L 77,24" fill="none" stroke="url(#welcome-logo)" stroke-width="6" stroke-linecap="round" />
              <path d="M 22,54 C 35,54 40,34 55,34 L 67,34" fill="none" stroke="url(#welcome-logo)" stroke-width="6" stroke-linecap="round" />
            </g>
            <text x="97" y="48" fill="#111827" font-family="Inter, sans-serif" font-size="22" font-weight="600" letter-spacing="-0.03em">Fluxpay</text>
          </svg>
          <button
            onClick={() => router.push("/login")}
            className="bg-[#8B5CF6] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-600 transition shadow-md shadow-purple-200"
          >
            Sign In
          </button>
        </nav>

        {/* Hero */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-50 rounded-full text-xs font-semibold text-[#8B5CF6] border border-purple-100">
              <Zap className="w-3.5 h-3.5" />
              Mobile Money for Africa
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
              Collect payments.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#10B981]">
                Grow your business.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
              Accept Mobile Money payments from MTN and Orange subscribers across Cameroon.
              Manage subscriptions, track sales, and send receipts — all from one dashboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => router.push("/login")}
                className="w-full sm:w-auto bg-[#8B5CF6] text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-purple-600 transition shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push("/login")}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
              >
                I already have an account
              </button>
            </div>
          </div>
        </main>

        {/* Features */}
        <section className="px-6 py-16 border-t border-gray-100">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-2xl p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mx-auto">
                <Smartphone className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Mobile Money</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Accept MTN MoMo and Orange Money payments directly from your customers&apos; phones.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto">
                <Repeat className="w-5 h-5 text-[#10B981]" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Recurring Billing</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Set up subscriptions and automatically charge customers every month.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mx-auto">
                <Shield className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">WhatsApp Receipts</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Send payment receipts and notifications instantly via WhatsApp.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-6 border-t border-gray-100">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400 font-medium">
              &copy; {new Date().getFullYear()} Fluxpay Technologies. All rights reserved.
            </p>
            <a href="mailto:support@fluxpay.com" className="text-xs font-semibold text-[#8B5CF6] hover:text-purple-500 transition">
              support@fluxpay.com
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
