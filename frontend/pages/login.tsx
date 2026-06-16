import React, { useState, useRef } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Shield, ChevronDown, User, Building2, Eye, EyeOff, Lock } from 'lucide-react';
import { useRouter } from 'next/router';
import { api, setToken, setSme } from '../lib/api';
import { showToast } from '../components/Toast';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const translations = {
  fr: {
    loginTitle: "Bonjour!",
    registerTitle: "Créer un compte",
    loginSubtitle: "Pour vous connecter à votre compte, renseignez votre adresse email ainsi que votre mot de passe.",
    registerSubtitle: "Remplissez vos informations ci-dessous pour démarrer avec Fluxpay.",
    namePlaceholder: "Votre nom complet",
    companyPlaceholder: "Nom de l'entreprise",
    emailPlaceholder: "Votre adresse email",
    passwordPlaceholder: "Votre mot de passe",
    forgotPassword: "Mot de passe oublié?",
    switchToRegister: "Pas de compte ? S'inscrire",
    switchToLogin: "Déjà un compte ? Se connecter",
    btnProcessing: "Traitement...",
    btnRegister: "Créer mon compte",
    btnLogin: "Etape suivante",
    contactText: "N'hésitez pas à nous contacter",
    copyright: "All rights reserved Fluxpay Technologies, 2024",
    msgDefaultTitle: "La nouvelle norme pour vos paiements.",
    msgDefaultSubtitle: "Gérez vos encaissements POS et abonnements en toute simplicité, de manière centralisée.",
    msgNameTitle: "Bienvenue à bord.",
    msgNameSubtitle: "Dites-nous comment vous appeler pour personnaliser votre expérience Fluxpay.",
    msgCompanyTitle: "Votre espace professionnel.",
    msgCompanySubtitle: "Entrez le nom de votre entreprise pour paramétrer votre point de vente et vos abonnements.",
    msgEmailTitle: "Accès rapide & sécurisé.",
    msgEmailSubtitle: "Votre adresse email nous permet d'identifier et de protéger votre espace de travail.",
    msgPasswordTitle: "Chiffrement de niveau bancaire.",
    msgPasswordSubtitle: "Vos informations sont chiffrées de bout en bout. Nous garantissons la confidentialité de vos données.",
    msgLoadingTitle: "Authentification...",
    msgLoadingSubtitle: "Veuillez patienter pendant la vérification de vos accès et la sécurisation de votre session.",
    confirmPasswordPlaceholder: "Confirmez votre mot de passe",
    passwordMismatch: "Les mots de passe ne correspondent pas",
    emailRequired: "L'adresse email est requise",
    passwordRequired: "Le mot de passe est requis",
    nameRequired: "Votre nom est requis",
    companyRequired: "Le nom de l'entreprise est requis",
    passwordWeak: "Mot de passe trop faible (8+ caractères, 1 maj, 1 chiffre)",
    invalidCredentials: "Email ou mot de passe incorrect",
    flag: "🇫🇷",
    langName: "Fr"
  },
  en: {
    loginTitle: "Welcome back!",
    registerTitle: "Create an account",
    loginSubtitle: "To log in to your account, please enter your email address and password.",
    registerSubtitle: "Fill in your details below to get started with Fluxpay.",
    namePlaceholder: "Your full name",
    companyPlaceholder: "Company name",
    emailPlaceholder: "Your email address",
    passwordPlaceholder: "Your password",
    forgotPassword: "Forgot password?",
    switchToRegister: "Don't have an account? Sign up",
    switchToLogin: "Already have an account? Log in",
    btnProcessing: "Processing...",
    btnRegister: "Create my account",
    btnLogin: "Next step",
    contactText: "Don't hesitate to contact us",
    copyright: "All rights reserved Fluxpay Technologies, 2024",
    msgDefaultTitle: "The new standard for your payments.",
    msgDefaultSubtitle: "Manage your POS collections and subscriptions with ease, from a centralized platform.",
    msgNameTitle: "Welcome aboard.",
    msgNameSubtitle: "Let us know what to call you to personalize your Fluxpay experience.",
    msgCompanyTitle: "Your professional space.",
    msgCompanySubtitle: "Enter your company name to set up your point of sale and subscriptions.",
    msgEmailTitle: "Fast & secure access.",
    msgEmailSubtitle: "Your email address allows us to identify and protect your workspace.",
    msgPasswordTitle: "Bank-grade encryption.",
    msgPasswordSubtitle: "Your information is end-to-end encrypted. We guarantee the confidentiality of your data.",
    msgLoadingTitle: "Authenticating...",
    msgLoadingSubtitle: "Please wait while we verify your access and secure your session.",
    confirmPasswordPlaceholder: "Confirm your password",
    passwordMismatch: "Passwords do not match",
    emailRequired: "Email address is required",
    passwordRequired: "Password is required",
    nameRequired: "Your name is required",
    companyRequired: "Company name is required",
    passwordWeak: "Password too weak (8+ chars, 1 uppercase, 1 number)",
    invalidCredentials: "Invalid email or password",
    flag: "🇬🇧",
    langName: "En"
  }
};

export default function AuthPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const t = translations[lang];

  const messages = {
    default: {
      title: t.msgDefaultTitle,
      subtitle: t.msgDefaultSubtitle,
      icon: (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-white/80 border-t-transparent mb-4"
        />
      )
    },
    name: {
      title: t.msgNameTitle,
      subtitle: t.msgNameSubtitle,
      icon: <User className="w-8 h-8 text-white/90 mb-4" />
    },
    company: {
      title: t.msgCompanyTitle,
      subtitle: t.msgCompanySubtitle,
      icon: <Building2 className="w-8 h-8 text-white/90 mb-4" />
    },
    email: {
      title: t.msgEmailTitle,
      subtitle: t.msgEmailSubtitle,
      icon: <Mail className="w-8 h-8 text-white/90 mb-4" />
    },
    password: {
      title: t.msgPasswordTitle,
      subtitle: t.msgPasswordSubtitle,
      icon: <Shield className="w-8 h-8 text-white/90 mb-4" />
    },
    loading: {
      title: t.msgLoadingTitle,
      subtitle: t.msgLoadingSubtitle,
      icon: (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-white border-t-transparent mb-4"
        />
      )
    }
  };

  const [isRegister, setIsRegister] = useState(false);
  
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focus, setFocus] = useState<'default' | 'name' | 'company' | 'email' | 'password' | 'loading'>('default');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccessTransition, setIsSuccessTransition] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 7) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score === 0) return 'bg-gray-200';
    if (score === 1) return 'bg-red-400';
    if (score === 2) return 'bg-orange-400';
    if (score === 3) return 'bg-yellow-400';
    return 'bg-emerald-500';
  };

  const formWrapperRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const loaderIconRef = useRef<HTMLDivElement>(null);

  // GSAP initial appearance
  useGSAP(() => {
    gsap.fromTo(formWrapperRef.current, 
      { opacity: 0, y: 20 }, 
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );
  }, []);

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // GSAP animation for switching between Login and Register
    const tl = gsap.timeline();
    
    tl.to(formWrapperRef.current, {
      opacity: 0,
      x: isRegister ? 40 : -40,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        setIsRegister(!isRegister);
        setFocus('default');
        setName('');
        setCompany('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setFormErrors({});
        // Set initial position for incoming animation
        gsap.set(formWrapperRef.current, { x: isRegister ? -40 : 40 });
      }
    }).to(formWrapperRef.current, {
      opacity: 1,
      x: 0,
      duration: 0.5,
      ease: "back.out(1.2)",
      clearProps: "x" // clean up inline styles
    });
  };

  const toggleLanguage = () => {
    setLang(lang === 'fr' ? 'en' : 'fr');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Front-end validation
    let errors: Record<string, string> = {};
    if (!email) errors.email = t.emailRequired;
    if (!password) errors.password = t.passwordRequired;
    
    if (isRegister) {
      if (!name) errors.name = t.nameRequired;
      if (!company) errors.company = t.companyRequired;
      if (password !== confirmPassword) errors.confirmPassword = t.passwordMismatch;
      if (getPasswordStrength(password) < 3) errors.password = t.passwordWeak;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});
    setFocus('loading');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister 
        ? { business_name: company, phone: "", email, password, business_type: "solo" }
        : { email, password };
      
      const res = await api(endpoint, {
        method: 'POST',
        body: body
      });
      
      setToken(res.access_token);
      if (res.sme) {
        setSme(res.sme);
      }
      
      let nextUrl = '/';
      if (isRegister) {
        nextUrl = '/onboarding';
      } else {
        try {
          const prefs = await api('/api/preferences', { token: res.access_token });
          if (!prefs.onboarding_complete) {
            nextUrl = '/onboarding';
          }
        } catch (e) {
          // Ignore
        }
      }
      
      showToast(isRegister ? (lang === 'fr' ? 'Inscription réussie' : 'Registration successful') : (lang === 'fr' ? 'Connexion réussie' : 'Login successful'), 'success');
      
      window.location.href = nextUrl;
      
    } catch (error: any) {
      const errorMessage = error.message || t.invalidCredentials;
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('user') || errorMessage.toLowerCase().includes('not found')) {
        setFormErrors({ email: errorMessage });
      } else if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('credential')) {
        setFormErrors({ password: errorMessage });
      } else {
        setFormErrors({ general: errorMessage });
      }
      setFocus('default');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{isRegister ? t.registerTitle : t.loginTitle} | Fluxpay</title>
      </Head>
      <div className="min-h-screen flex w-full bg-white font-sans text-black overflow-hidden">
        
        {/* Left Side - Auth Form */}
        <div className="w-full lg:w-1/2 flex flex-col relative z-10 px-8 py-8 sm:px-16 lg:px-24">
          
          {/* Header Top Nav */}
          <div className="flex justify-between items-center w-full mb-auto">
            {/* Logo */}
            <div className="font-bold text-xl tracking-tight flex items-center">
              <span className="text-black">Flux</span>
              <span className="text-[#8B5CF6]">pay</span>
            </div>
            
            {/* Language Selector */}
            <div 
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-sm font-semibold text-black cursor-pointer hover:opacity-80 transition-opacity bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100"
            >
              <span>{t.flag}</span>
              <span>{t.langName}</span>
              <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
            </div>
          </div>

          {/* Form Container (Centered vertically) */}
          <div className="w-full max-w-[380px] mx-auto my-auto pt-8 relative">
            {!isSuccessTransition ? (
              <div ref={formWrapperRef} className="text-center">
                <h1 className="text-[32px] font-bold mb-8 tracking-tight">
                  {isRegister ? t.registerTitle : t.loginTitle}
                </h1>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {isRegister && (
                  <>
                    <div className="space-y-1">
                      <div className="relative">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
                          <User className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => { setName(e.target.value); setFormErrors(prev => ({...prev, name: ''})) }}
                          onFocus={() => setFocus('name')}
                          onBlur={() => setFocus('default')}
                          placeholder={t.namePlaceholder}
                          className={`w-full bg-[#F9FAFB] border focus:bg-white focus:ring-4 rounded-full pl-14 pr-6 py-4 text-sm font-medium outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${
                            formErrors.name ? 'border-red-300 focus:border-red-300 focus:ring-red-100' : 'border-transparent focus:border-purple-200 focus:ring-purple-100'
                          }`}
                        />
                      </div>
                      {formErrors.name && <p className="text-xs text-red-500 font-medium pl-6">{formErrors.name}</p>}
                    </div>
                    <div className="space-y-1">
                      <div className="relative">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => { setCompany(e.target.value); setFormErrors(prev => ({...prev, company: ''})) }}
                          onFocus={() => setFocus('company')}
                          onBlur={() => setFocus('default')}
                          placeholder={t.companyPlaceholder}
                          className={`w-full bg-[#F9FAFB] border focus:bg-white focus:ring-4 rounded-full pl-14 pr-6 py-4 text-sm font-medium outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${
                            formErrors.company ? 'border-red-300 focus:border-red-300 focus:ring-red-100' : 'border-transparent focus:border-purple-200 focus:ring-purple-100'
                          }`}
                        />
                      </div>
                      {formErrors.company && <p className="text-xs text-red-500 font-medium pl-6">{formErrors.company}</p>}
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setFormErrors(prev => ({...prev, email: ''})) }}
                      onFocus={() => setFocus('email')}
                      onBlur={() => setFocus('default')}
                      placeholder={t.emailPlaceholder}
                      className={`w-full bg-[#F9FAFB] border focus:bg-white focus:ring-4 rounded-full pl-14 pr-6 py-4 text-sm font-medium outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${
                        formErrors.email ? 'border-red-300 focus:border-red-300 focus:ring-red-100' : 'border-transparent focus:border-purple-200 focus:ring-purple-100'
                      }`}
                    />
                  </div>
                  {formErrors.email && <p className="text-xs text-red-500 font-medium pl-6">{formErrors.email}</p>}
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFormErrors(prev => ({...prev, password: ''})) }}
                      onFocus={() => setFocus('password')}
                      onBlur={() => setFocus('default')}
                      placeholder={t.passwordPlaceholder}
                      className={`w-full bg-[#F9FAFB] border focus:bg-white focus:ring-4 rounded-full pl-14 pr-12 py-4 text-sm font-medium outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${
                        formErrors.password ? 'border-red-300 focus:border-red-300 focus:ring-red-100' : 'border-transparent focus:border-emerald-200 focus:ring-emerald-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword
                        ? <EyeOff className="w-5 h-5" />
                        : <Eye className="w-5 h-5" />
                      }
                    </button>
                  </div>
                  
                  {isRegister && password && (
                    <div className="px-6 pt-1 flex gap-1">
                      {[1, 2, 3, 4].map(level => (
                        <div 
                          key={level} 
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${level <= getPasswordStrength(password) ? getPasswordStrengthColor(getPasswordStrength(password)) : 'bg-gray-200'}`} 
                        />
                      ))}
                    </div>
                  )}
                  {formErrors.password && <p className="text-xs text-red-500 font-medium pl-6">{formErrors.password}</p>}
                </div>

                {isRegister && (
                  <div className="space-y-1">
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setFormErrors(prev => ({...prev, confirmPassword: ''})) }}
                        onFocus={() => setFocus('password')}
                        onBlur={() => setFocus('default')}
                        placeholder={t.confirmPasswordPlaceholder}
                        className={`w-full bg-[#F9FAFB] border focus:bg-white focus:ring-4 rounded-full pl-14 pr-12 py-4 text-sm font-medium outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${
                          formErrors.confirmPassword
                            ? 'border-red-300 focus:border-red-300 focus:ring-red-100'
                            : confirmPassword && confirmPassword === password
                            ? 'border-emerald-300 focus:border-emerald-200 focus:ring-emerald-100'
                            : 'border-transparent focus:border-emerald-200 focus:ring-emerald-100'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword
                          ? <EyeOff className="w-5 h-5" />
                          : <Eye className="w-5 h-5" />
                        }
                      </button>
                    </div>
                    {formErrors.confirmPassword && (
                      <p className="text-xs text-red-500 font-medium pl-6">{formErrors.confirmPassword}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 pb-4 pl-2">
                  {!isRegister && (
                    <a href="#" className="text-xs font-semibold text-[#10B981] hover:text-emerald-600 transition-colors">
                      {t.forgotPassword}
                    </a>
                  )}
                  <a href="#" onClick={toggleMode} className={`text-xs font-semibold text-[#8B5CF6] hover:text-purple-500 transition-colors ${isRegister ? 'ml-0' : 'ml-auto'}`}>
                    {isRegister ? t.switchToLogin : t.switchToRegister}
                  </a>
                </div>

                {formErrors.general && (
                  <div className="bg-red-50 text-red-600 text-sm font-medium py-3 px-4 rounded-xl text-center mb-4">
                    {formErrors.general}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white rounded-full py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 focus:ring-4 focus:ring-zinc-200 transition-all duration-300 disabled:opacity-70"
                >
                  {loading ? t.btnProcessing : (isRegister ? t.btnRegister : t.btnLogin)}
                </button>
              </form>
            </div>
            ) : (
              <div ref={loaderRef} className="text-center flex flex-col items-center justify-center py-20 opacity-0 absolute inset-0">
                <div 
                  ref={loaderIconRef}
                  className="w-16 h-16 rounded-full border-4 border-purple-100 border-t-purple-600 mb-6 mx-auto"
                />
                <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                  {lang === 'fr' ? 'Connexion réussie' : 'Login successful'}
                </h3>
                <p className="text-gray-500 font-medium">
                  {lang === 'fr' ? 'Préparation de votre espace...' : 'Preparing your workspace...'}
                </p>
              </div>
            )}
          </div>

          {/* Footer Contact */}
          <div className="text-center mt-auto pb-12 pt-8">
            <p className="text-xs text-black font-semibold mb-1">
              {t.contactText}
            </p>
            <a href="mailto:support@fluxpay.com" className="text-xs font-semibold text-[#10B981] hover:text-emerald-600 transition-colors">
              support@fluxpay.com
            </a>
          </div>

          {/* Copyright text */}
          <div className="absolute bottom-6 left-0 right-0 text-center text-gray-300 text-[10px] font-medium">
            {t.copyright}
          </div>
        </div>

        {/* Right Side - Image & Glassmorphism Card */}
        <div className="hidden lg:block lg:w-1/2 relative bg-zinc-100 overflow-hidden">
          
          {/* Background Image */}
          {/* CHANGE_IMAGE_URL_HERE: Replace the URL inside url("") to your preferred image link */}
          <div 
            className="absolute inset-0 bg-cover bg-center transform scale-105 transition-transform duration-10000"
            style={{ 
              backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2569&auto=format&fit=crop")',
              filter: 'brightness(0.95)'
            }}
          />

          {/* Dynamic Glassmorphism Card */}
          <div className="absolute inset-0 flex items-center justify-center px-12">
            <motion.div 
              layout
              className="w-full max-w-[480px] rounded-3xl border border-white/30 bg-white/20 backdrop-blur-md shadow-2xl overflow-hidden relative"
            >
              
              <div className="p-10 relative z-10 min-h-[300px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={focus + lang} // Re-animate on language change or focus change
                    initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    {messages[focus].icon}
                    <h2 className="text-[28px] leading-tight font-semibold text-white tracking-tight mb-4 drop-shadow-sm">
                      {messages[focus].title}
                    </h2>
                    <p className="text-white/90 leading-relaxed text-[15px] font-medium drop-shadow-sm">
                      {messages[focus].subtitle}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </>
  );
}
