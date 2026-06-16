import React, { useEffect, useState, useCallback, useRef } from "react";
import Head from 'next/head';
import { useRouter } from "next/router";
import { api, getToken, getSme, setPreferencesFallback, getPreferencesFallback } from "../lib/api";
import { showToast } from "../components/Toast";
import { User, Building2, RefreshCw, ShoppingCart, CheckCircle2, ChevronDown, ArrowLeft, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const getBotUrl = () => {
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost") {
      return "http://localhost:3001";
    }
  }
  return process.env.NEXT_PUBLIC_BOT_URL || "https://zooming-bravery-production-f6f7.up.railway.app";
};

interface BotStatus {
  connected: boolean;
  qr_data_url: string | null;
  user: string | null;
}

const STEPS = ["business_type", "use_case", "whatsapp"];

const translations = {
  en: {
    welcome: "Welcome to Fluxpay",
    subtitle: "Let's configure your workspace",
    step1: "What type of business do you run?",
    step1Sub: "This helps us customize your experience",
    solo: "Solo Business",
    soloDesc: "I run my business alone or with a small team",
    enterprise: "Enterprise",
    enterpriseDesc: "I have a team and need advanced features",
    step2: "How will you use Fluxpay?",
    step2Sub: "Choose what fits your business needs",
    subs: "Manage Subscriptions",
    subsDesc: "Collect monthly recurring payments from customers",
    sales: "Manage Product Sales",
    salesDesc: "Register products and accept one-time payments",
    step3: "Connect WhatsApp",
    step3Sub: "Send receipts and payment notifications to your customers",
    btnSkip: "OK, Go to Dashboard",
    btnBack: "Back",
    langName: "EN",
    flag: "🇺🇸",
    loadingBot: "Connecting to bot...",
    whatsappConnected: "WhatsApp Connected!",
    whatsappDesc: "Your customers will receive receipts on WhatsApp.",
    disconnect: "Disconnect WhatsApp",
    qrWait: "Waiting for QR code...",
    qrInstructions: "Open WhatsApp → Settings → Linked Devices → Link a Device",
    allGood: "All Good!",
    preparing: "Preparing your dashboard...",
  },
  fr: {
    welcome: "Bienvenue sur Fluxpay",
    subtitle: "Configurons votre espace de travail",
    step1: "Quel type d'entreprise dirigez-vous ?",
    step1Sub: "Cela nous aide à personnaliser votre expérience",
    solo: "Entreprise Individuelle",
    soloDesc: "Je gère mon entreprise seul ou avec une petite équipe",
    enterprise: "Entreprise",
    enterpriseDesc: "J'ai une équipe et j'ai besoin de fonctionnalités avancées",
    step2: "Comment allez-vous utiliser Fluxpay ?",
    step2Sub: "Choisissez ce qui correspond à vos besoins",
    subs: "Gérer les Abonnements",
    subsDesc: "Collectez des paiements récurrents mensuels",
    sales: "Gérer les Ventes",
    salesDesc: "Enregistrez des produits et acceptez des paiements uniques",
    step3: "Connecter WhatsApp",
    step3Sub: "Envoyez des reçus et des notifications de paiement à vos clients",
    btnSkip: "OK, Aller au Tableau de Bord",
    btnBack: "Retour",
    langName: "FR",
    flag: "🇫🇷",
    loadingBot: "Connexion au bot...",
    whatsappConnected: "WhatsApp Connecté !",
    whatsappDesc: "Vos clients recevront des reçus sur WhatsApp.",
    disconnect: "Déconnecter WhatsApp",
    qrWait: "En attente du code QR...",
    qrInstructions: "Ouvrez WhatsApp → Paramètres → Appareils connectés → Connecter un appareil",
    allGood: "Tout est parfait !",
    preparing: "Préparation de votre tableau de bord...",
  }
};

export default function Onboarding() {
  const router = useRouter();
  const [lang, setLang] = useState<'en' | 'fr'>('fr');
  const t = translations[lang];
  
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState("");
  const [useCase, setUseCase] = useState("");
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sme = getSme();

  const cardRef = useRef<HTMLDivElement>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);
  
  const toggleLanguage = () => {
    setLang(lang === 'fr' ? 'en' : 'fr');
  };

  const checkBotStatus = useCallback(async () => {
    try {
      const botUrl = getBotUrl();
      const smeId = sme?.id;
      if (!smeId) return false;
      const res = await fetch(`${botUrl}/status?sme_id=${smeId}`);
      const data = await res.json();
      if (data.connected) {
        setBotStatus({ connected: true, qr_data_url: null, user: data.user });
        return true;
      }
      const qrRes = await fetch(`${botUrl}/qr-json?sme_id=${smeId}`);
      const qrData = await qrRes.json();
      setBotStatus(qrData);
      return qrData.connected;
    } catch {
      setBotStatus({ connected: false, qr_data_url: null, user: null });
      return false;
    }
  }, [sme]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    if (sme) {
      const localPrefs = getPreferencesFallback(sme.id);
      if (localPrefs && localPrefs.onboarding_complete) {
        setBusinessType(localPrefs.business_type || "solo");
        setUseCase(localPrefs.use_case || "subscriptions");
      }
    }

    api("/api/preferences", { token })
      .then((prefs) => {
        if (prefs && prefs.onboarding_complete) {
          setBusinessType(prefs.business_type || "solo");
          setUseCase(prefs.use_case || "subscriptions");
          if (sme) {
            setPreferencesFallback(sme.id, prefs);
          }
        }
      })
      .catch(() => {});

    checkBotStatus().then(() => setLoading(false));
  }, [checkBotStatus, router, sme]);

  // Polling for WhatsApp status ONLY on step 2
  useEffect(() => {
    if (step === 2) {
      const interval = setInterval(async () => {
        const connected = await checkBotStatus();
        if (connected) {
          clearInterval(interval);
        }
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [step, checkBotStatus]);

  useGSAP(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, 
        { opacity: 0, y: 20, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }
      );
    }
  }, []);

  const goToNextStep = (newStep: number, type?: string, val?: string) => {
    if (type === 'businessType') setBusinessType(val || "");
    if (type === 'useCase') setUseCase(val || "");

    if (stepContentRef.current) {
      gsap.to(stepContentRef.current, {
        opacity: 0,
        x: -20,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          setStep(newStep);
          gsap.fromTo(stepContentRef.current,
            { opacity: 0, x: 20 },
            { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
          );
        }
      });
    } else {
      setStep(newStep);
    }
  };

  const handleComplete = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const token = getToken();
      if (token) {
        await api("/api/preferences", {
          method: "POST",
          token,
          body: { business_type: businessType, use_case: useCase },
        });
      }
      if (sme && sme.id) {
        setPreferencesFallback(sme.id, {
          business_type: businessType,
          use_case: useCase,
          onboarding_complete: true,
        });
      }
      window.location.href = '/';
    } catch (e: any) {
      if (sme && sme.id) {
        setPreferencesFallback(sme.id, {
          business_type: businessType,
          use_case: useCase,
          onboarding_complete: true,
        });
        window.location.href = "/";
      } else {
        showToast(e.message || "An error occurred", "error");
        setSaving(false);
      }
    }
  };

  return (
    <>
      <Head>
        <title>Fluxpay — Setup Workspace</title>
      </Head>
      <div className="min-h-screen flex flex-col w-full relative overflow-hidden bg-[#f5f5f7]">
        
        {/* Top Navbar */}
        <header className="w-full px-6 py-5 md:px-10 flex justify-between items-center z-20">
          <div className="font-bold text-2xl tracking-tight flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#8B5CF6] flex items-center justify-center">
              <span className="text-white text-xs font-black">F</span>
            </div>
            <span className="text-gray-900 font-bold">
              Flux<span className="text-[#8B5CF6]">pay</span>
            </span>
          </div>
          
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors bg-white px-3.5 py-2 rounded-xl border border-gray-200/60 shadow-sm"
          >
            <span>{t.flag}</span>
            <span>{t.langName}</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-gray-400" />
          </button>
        </header>
        
        {/* Centered Workspace Config Card */}
        <div className="flex-1 flex items-center justify-center p-4 z-10 md:pb-20">
          <div 
            ref={cardRef}
            className="w-full max-w-[480px] bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden"
          >
            <div className="p-8 md:p-10 relative z-10 min-h-[380px] flex flex-col justify-between">
              
              <div ref={stepContentRef} className="w-full flex-1 flex flex-col justify-center">
                {/* Step 1: Business Type */}
                {step === 0 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-2 mb-2">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-50 text-[#8B5CF6]">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t.step1}</h2>
                      <p className="text-gray-400 text-xs font-medium">{t.step1Sub}</p>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={() => goToNextStep(1, 'businessType', 'solo')}
                        className="w-full p-4.5 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left flex items-center gap-4 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-[#8B5CF6]/10 transition">
                          <User className="w-5 h-5 text-[#8B5CF6]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-sm">{t.solo}</p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.soloDesc}</p>
                        </div>
                      </button>

                      <button
                        onClick={() => goToNextStep(1, 'businessType', 'enterprise')}
                        className="w-full p-4.5 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left flex items-center gap-4 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-[#10B981]/10 transition">
                          <Building2 className="w-5 h-5 text-[#10B981]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-sm">{t.enterprise}</p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.enterpriseDesc}</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Use Case */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-2 mb-2">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-50 text-[#8B5CF6]">
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t.step2}</h2>
                      <p className="text-gray-400 text-xs font-medium">{t.step2Sub}</p>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={() => goToNextStep(2, 'useCase', 'subscriptions')}
                        className="w-full p-4.5 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left flex items-center gap-4 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-[#8B5CF6]/10 transition">
                          <RefreshCw className="w-5 h-5 text-[#8B5CF6]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-sm">{t.subs}</p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.subsDesc}</p>
                        </div>
                      </button>

                      <button
                        onClick={() => goToNextStep(2, 'useCase', 'sales')}
                        className="w-full p-4.5 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left flex items-center gap-4 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-[#10B981]/10 transition">
                          <ShoppingCart className="w-5 h-5 text-[#10B981]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-sm">{t.sales}</p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.salesDesc}</p>
                        </div>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-center pt-2">
                      <button 
                        onClick={() => goToNextStep(0)} 
                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        {t.btnBack}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: WhatsApp */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-2 mb-2">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-[#10B981]">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t.step3}</h2>
                      <p className="text-gray-400 text-xs font-medium">{t.step3Sub}</p>
                    </div>

                    <div className="flex flex-col items-center">
                      {loading ? (
                        <div className="text-center py-6">
                          <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin mx-auto mb-3" />
                          <p className="text-gray-400 text-xs font-semibold">{t.loadingBot}</p>
                        </div>
                      ) : botStatus?.connected ? (
                        <div className="text-center py-4 w-full">
                          <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <CheckCircle2 className="w-7 h-7" />
                          </div>
                          <h3 className="text-base font-bold text-emerald-600 mb-1">{t.whatsappConnected}</h3>
                          <p className="text-gray-400 text-xs max-w-[280px] mx-auto leading-relaxed">{t.whatsappDesc}</p>
                        </div>
                      ) : botStatus?.qr_data_url ? (
                        <div className="text-center py-2 space-y-4">
                          <div className="bg-white p-3 rounded-2xl inline-block border border-gray-100 shadow-sm">
                            <img src={botStatus.qr_data_url} alt="WhatsApp QR Code" className="w-40 h-40 rounded-xl" />
                          </div>
                          <p className="text-gray-400 text-[11px] font-semibold max-w-[280px] mx-auto leading-relaxed">
                            {t.qrInstructions}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin mx-auto mb-3" />
                          <p className="text-gray-400 text-xs font-semibold">{t.qrWait}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 gap-4">
                      <button 
                        onClick={() => goToNextStep(1)} 
                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        {t.btnBack}
                      </button>

                      <button 
                        onClick={handleComplete} 
                        disabled={saving} 
                        className="px-6 py-3 bg-[#8B5CF6] hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-100 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {t.btnSkip}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress indicator */}
              <div className="flex justify-center gap-2 mt-8 shrink-0">
                {STEPS.map((s, i) => (
                  <div 
                    key={s} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-[#8B5CF6]' : 'w-1.5 bg-gray-200'}`} 
                  />
                ))}
              </div>

            </div>
          </div>
        </div>

      </div>
    </>
  );
}
