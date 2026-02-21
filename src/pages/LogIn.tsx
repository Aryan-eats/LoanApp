import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Lock,
  Shield,
  Eye,
  EyeOff,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Zap,
  Building2,
  Star,
  Phone,
} from 'lucide-react';
import useAuthStore from '../stores/authStore';

type LoginType = 'select' | 'partner' | 'admin';
type Lang = 'en' | 'hi';

// ─── i18n ────────────────────────────────────────────────────────────────────
const i18n: Record<Lang, Record<string, string>> = {
  en: {
    welcome: 'Welcome Back',
    selectRole: 'Choose your login portal',
    partnerTitle: 'Partner Portal',
    partnerSub: 'DSA agents, NBFCs & referral partners',
    adminTitle: 'Admin Access',
    adminSub: 'Authorized personnel only',
    emailLabel: 'Email Address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    rememberMe: 'Keep me signed in',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign In',
    signingIn: 'Signing In…',
    noAccount: "Don't have an account?",
    becomePartner: 'Become a Partner →',
    backToHome: '← Back to Home',
    back: '← Back',
    trustLine: '256-bit SSL · NBFC Compliant',
    phone: '+91 98765 43210',
    partnerMotivation: 'Cross ₹5L monthly disbursals to unlock 80% high-performance commission.',
    adminWarning: 'Platform administrators only. Unauthorized access is strictly prohibited.',
    twoFaNote: '2-factor authentication is active on admin accounts',
  },
  hi: {
    welcome: 'वापसी पर स्वागत है',
    selectRole: 'अपना लॉगिन पोर्टल चुनें',
    partnerTitle: 'पार्टनर पोर्टल',
    partnerSub: 'DSA एजेंट, NBFC और रेफरल पार्टनर',
    adminTitle: 'एडमिन एक्सेस',
    adminSub: 'केवल अधिकृत कर्मचारी',
    emailLabel: 'ईमेल पता',
    emailPlaceholder: 'aap@example.com',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: '••••••••',
    rememberMe: 'साइन इन रखें',
    forgotPassword: 'पासवर्ड भूल गए?',
    signIn: 'साइन इन करें',
    signingIn: 'साइन इन हो रहा है…',
    noAccount: 'खाता नहीं है?',
    becomePartner: 'पार्टनर बनें →',
    backToHome: '← होम पर वापस',
    back: '← वापस',
    trustLine: '256-bit SSL सुरक्षित · NBFC अनुपालित',
    phone: '+91 98765 43210',
    partnerMotivation: '₹5L मासिक वितरण पार करके 80% हाई-परफॉर्मेंस कमीशन अनलॉक करें।',
    adminWarning: 'यह पोर्टल केवल प्लेटफ़ॉर्म एडमिन के लिए है। अनधिकृत पहुंच सख्त वर्जित है।',
    twoFaNote: 'एडमिन खातों पर 2-फ़ैक्टर प्रमाणीकरण सक्रिय है',
  },
};

// ─── Animation variants (using named easing strings — no raw bezier arrays) ──
const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit:   { opacity: 0, y: -16, transition: { duration: 0.22, ease: 'easeIn' } },
};

const stagger: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemFade: Variants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Trust badges ─────────────────────────────────────────────────────────────
const BADGES = [
  { icon: CheckCircle2, label: 'RBI Compliant' },
  { icon: Shield,       label: '256-bit SSL' },
  { icon: Star,         label: '₹500Cr+ Disbursed' },
  { icon: Building2,    label: '20+ Bank Partners' },
];

const METRICS = [
  { value: '₹500Cr+', label: 'Disbursed' },
  { value: '10,000+', label: 'Happy Clients' },
  { value: '20+',     label: 'Bank Partners' },
  { value: '99.8%',   label: 'Uptime SLA' },
];

// ─── Component ────────────────────────────────────────────────────────────────
const LogIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error: authError, clearError } = useAuthStore();

  const [loginType, setLoginType]     = useState<LoginType>('select');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lang, setLang]               = useState<Lang>('en');

  const t = i18n[lang];
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearError();
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      if (loginType === 'admin'   && user?.role !== 'admin')   { setError('You do not have admin access.'); return; }
      if (loginType === 'partner' && user?.role !== 'partner') { setError('Please use the Admin portal for admin accounts.'); return; }
      const destination =
        user?.role === 'admin'
          ? from?.startsWith('/admin')   ? from : '/admin'
          : user?.role === 'partner'
          ? from?.startsWith('/partner') ? from : '/partner'
          : '/';
      navigate(destination, { replace: true });
    } catch (err) {
      const { parseApiError } = await import('../utils/parseApiError');
      setError(parseApiError(err, 'Login failed. Please try again.'));
    }
  };

  const handleBack = () => {
    setLoginType('select');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError(null);
    clearError();
  };

  const displayError = error || authError;
  const isPartner    = loginType === 'partner';
  const accentGrad   = isPartner ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'linear-gradient(135deg,#1f2937,#374151)';

  return (
    /* Outer shell: full-screen, no scroll */
    <div className="h-screen w-screen overflow-hidden flex flex-col lg:flex-row font-sans">

      {/* ── LEFT BRAND PANEL (desktop only) ─────────────────────────────── */}
      <aside
        className="hidden lg:flex lg:w-5/12 xl:w-[44%] shrink-0 flex-col justify-between p-10 xl:p-14 overflow-hidden relative"
        style={{ background: 'linear-gradient(155deg,#0f1923 0%,#0b2545 50%,#13315c 100%)' }}
      >
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.18),transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-60 h-60 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.15),transparent 70%)' }} />

        {/* Logo */}
        <Link to="/" className="relative z-10 block">
          <img src="/logo.png" alt="GPS India Financial Services" className="h-14 w-auto" />
        </Link>

        {/* Centre copy */}
        <div className="relative z-10 space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-1.5 text-[11px] font-semibold tracking-widest text-blue-200 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Trusted DSA · Since 2007
          </span>

          <h2 className="text-[2rem] xl:text-[2.25rem] font-bold leading-tight text-white"
              style={{ fontFamily: '"Playfair Display",serif' }}>
            Delhi's approved<br />
            <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(90deg,#60a5fa,#a78bfa)' }}>
              Loan Management
            </span>{' '}Platform
          </h2>

          <p className="text-sm text-blue-200/75 leading-relaxed max-w-xs">
            Empowering DSAs, NBFCs, and referral partners with real-time dashboards, instant
            commission tracking, and a seamless client experience.
          </p>

          {/* Metric grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {METRICS.map((m) => (
              <div key={m.label} className="rounded-xl border border-white/8 bg-white/5 p-3">
                <div className="text-xl font-bold text-white">{m.value}</div>
                <div className="mt-0.5 text-[11px] text-blue-300/60">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="relative z-10 flex flex-wrap gap-2">
          {BADGES.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] text-blue-200">
              <Icon size={10} className="text-emerald-400" />
              {label}
            </span>
          ))}
        </div>
      </aside>

      {/* ── RIGHT FORM PANEL ──────────────────────────────────────────────── */}
      <main
        className="flex-1 flex flex-col overflow-y-auto"
        style={{ background: 'linear-gradient(160deg,#f8faff 0%,#eef2ff 100%)' }}
      >
        {/* Mobile top-bar (visible only on < lg) */}
        <div className="lg:hidden flex items-center justify-between px-5 pt-5 pb-3">
          <Link to="/">
            <img src="/logo.png" alt="GPS India" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            {/* Mobile trust pill */}
            <span className="hidden sm:flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">
              <Shield size={9} /> 256-bit SSL
            </span>
            {/* Lang toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 transition-colors"
            >
              <span className="text-sm leading-none">{lang === 'en' ? '🇮🇳' : '🇬🇧'}</span>
              {lang === 'en' ? 'हिन्दी' : 'English'}
            </button>
          </div>
        </div>

        {/* Mobile compact brand banner (below lg) */}
        <div
          className="lg:hidden mx-4 mb-4 rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#0b2545 0%,#13315c 100%)' }}
        >
          <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.3),transparent 70%)' }} />
          <p className="relative z-10 text-[11px] font-semibold tracking-widest text-blue-300/70 uppercase mb-1">
            GPS India Financial Services
          </p>
          <p className="relative z-10 text-base font-bold text-white leading-snug mb-3"
             style={{ fontFamily: '"Playfair Display",serif' }}>
            India's Most Trusted Loan Management Platform
          </p>
          <div className="relative z-10 flex flex-wrap gap-2">
            {METRICS.map((m) => (
              <div key={m.label} className="rounded-lg border border-white/10 bg-white/8 px-3 py-1.5 text-center">
                <div className="text-sm font-bold text-white">{m.value}</div>
                <div className="text-[9px] text-blue-300/60">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Centred form area ── */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 pb-6">

          {/* Desktop lang toggle */}
          <div className="hidden lg:flex w-full max-w-sm justify-end mb-3">
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 transition-colors"
            >
              <span className="text-sm leading-none">{lang === 'en' ? '🇮🇳' : '🇬🇧'}</span>
              {lang === 'en' ? 'हिन्दी' : 'English'}
            </button>
          </div>

          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">

              {/* ── ROLE SELECTION ── */}
              {loginType === 'select' && (
                <motion.div key="select" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit"
                  className="rounded-2xl bg-white shadow-xl border border-indigo-100/60 overflow-hidden">

                  <div className="px-6 pt-6 pb-4">
                    <h1 className="text-2xl font-bold text-gray-900"
                        style={{ fontFamily: '"Playfair Display",serif' }}>
                      {t.welcome}
                    </h1>
                    <p className="mt-0.5 text-xs text-gray-400">{t.selectRole}</p>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-indigo-100 to-transparent" />

                  <motion.div className="p-5 space-y-3" variants={stagger} initial="hidden" animate="visible">

                    {/* Partner card */}
                    <motion.button variants={itemFade} onClick={() => setLoginType('partner')}
                      className="group w-full rounded-xl border border-transparent p-px shadow-sm hover:shadow-md transition-shadow"
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                      <div className="flex items-center gap-4 rounded-[11px] bg-white px-5 py-4 group-hover:bg-transparent transition-colors duration-300">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 group-hover:from-blue-500 group-hover:to-indigo-600 transition-colors duration-300 shadow-sm">
                          <Users size={19} className="text-indigo-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-bold text-gray-900 group-hover:text-white transition-colors duration-300">{t.partnerTitle}</div>
                          <div className="mt-0.5 text-xs text-gray-500 group-hover:text-blue-100 transition-colors duration-300">{t.partnerSub}</div>
                        </div>
                        <ChevronRight size={15} className="shrink-0 text-gray-300 group-hover:text-white transition-colors duration-300" />
                      </div>
                    </motion.button>

                    {/* Motivation strip */}
                    <motion.div variants={itemFade}
                      className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                      <Zap size={12} className="mt-0.5 shrink-0 text-amber-500" />
                      <p className="text-[11px] leading-snug text-amber-800">{t.partnerMotivation}</p>
                    </motion.div>

                    {/* Divider */}
                    <motion.div variants={itemFade} className="flex items-center gap-3 py-0.5">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-[10px] font-semibold tracking-widest text-gray-300 uppercase">or</span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </motion.div>

                    {/* Admin card */}
                    <motion.button variants={itemFade} onClick={() => setLoginType('admin')}
                      className="group w-full flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 transition-all hover:border-gray-400 hover:bg-gray-100">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-200 group-hover:bg-gray-800 transition-colors duration-300 shadow-sm">
                        <Shield size={17} className="text-gray-600 group-hover:text-white transition-colors duration-300" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-bold text-gray-700">{t.adminTitle}</div>
                        <div className="mt-0.5 text-xs text-gray-400">{t.adminSub}</div>
                      </div>
                      <ChevronRight size={15} className="shrink-0 text-gray-300 group-hover:text-gray-600 transition-colors" />
                    </motion.button>

                    <motion.div variants={itemFade} className="pt-1 text-center">
                      <Link to="/" className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">{t.backToHome}</Link>
                    </motion.div>
                  </motion.div>

                  {/* Trust strip */}
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-gray-100 px-5 py-2.5">
                    {BADGES.map(({ icon: Icon, label }) => (
                      <span key={label} className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Icon size={8} className="text-emerald-500" />{label}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── LOGIN FORM ── */}
              {loginType !== 'select' && (
                <motion.div key="form" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit"
                  className="rounded-2xl bg-white shadow-xl border border-indigo-100/60 overflow-hidden">

                  {/* Role colour bar */}
                  <div className="h-1 w-full" style={{ background: accentGrad }} />

                  <div className="p-5 sm:p-6">
                    {/* Back */}
                    <button onClick={handleBack}
                      className="group mb-5 flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-700">
                      <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                      {t.back}
                    </button>

                    {/* Header */}
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                           style={{ background: accentGrad }}>
                        {isPartner ? <Users size={17} className="text-white" /> : <Shield size={17} className="text-white" />}
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-gray-900">
                          {isPartner ? t.partnerTitle : t.adminTitle}
                        </h1>
                        <p className="text-xs text-gray-400">{isPartner ? t.partnerSub : t.adminSub}</p>
                      </div>
                    </div>

                    {/* Info banners */}
                    <AnimatePresence>
                      {!isPartner && (
                        <motion.div key="admin-warn"
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                          <AlertCircle size={12} className="mt-0.5 shrink-0 text-amber-600" />
                          <p className="text-[11px] leading-snug text-amber-800">{t.adminWarning}</p>
                        </motion.div>
                      )}
                      {isPartner && (
                        <motion.div key="partner-tip"
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="mb-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
                          <Zap size={12} className="mt-0.5 shrink-0 text-blue-500" />
                          <p className="text-[11px] leading-snug text-blue-800">{t.partnerMotivation}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Error */}
                    <AnimatePresence>
                      {displayError && (
                        <motion.div role="alert"
                          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                          <AlertCircle size={12} className="mt-0.5 shrink-0 text-red-500" />
                          <p className="text-[11px] text-red-700">{displayError}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                      {/* Email */}
                      <div>
                        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-gray-700">
                          {t.emailLabel}
                        </label>
                        <div className="relative">
                          <Mail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="email" id="email" autoComplete="email"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder={t.emailPlaceholder} required
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all hover:border-gray-300 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-400" />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                            {t.passwordLabel}
                          </label>
                          <a href="#" className="text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-800">
                            {t.forgotPassword}
                          </a>
                        </div>
                        <div className="relative">
                          <Lock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type={showPassword ? 'text' : 'password'} id="password" autoComplete="current-password"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder={t.passwordPlaceholder} required
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all hover:border-gray-300 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-400" />
                          <button type="button" onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600">
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* Remember me */}
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="remember"
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <label htmlFor="remember" className="cursor-pointer select-none text-xs text-gray-500">
                          {t.rememberMe}
                        </label>
                      </div>

                      {/* Submit */}
                      <motion.button type="submit" disabled={isLoading} whileTap={{ scale: 0.98 }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                        style={{ background: accentGrad }}>
                        {isLoading
                          ? <><Loader2 size={15} className="animate-spin" />{t.signingIn}</>
                          : t.signIn}
                      </motion.button>
                    </form>

                    {/* Partner CTA */}
                    {isPartner && (
                      <p className="mt-4 text-center text-xs text-gray-500">
                        {t.noAccount}{' '}
                        <Link to="/onboarding" className="font-semibold text-indigo-600 transition-colors hover:text-indigo-800">
                          {t.becomePartner}
                        </Link>
                      </p>
                    )}

                    {/* Admin 2FA note */}
                    {!isPartner && (
                      <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
                        <Shield size={9} className="text-emerald-500" />
                        {t.twoFaNote}
                      </p>
                    )}
                  </div>

                  {/* Bottom trust bar */}
                  <div className="flex items-center justify-between border-t border-gray-100 px-5 py-2.5">
                    <p className="text-[10px] text-gray-400">{t.trustLine}</p>
                    <a href={`tel:${t.phone.replace(/\s/g, '')}`}
                      className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:underline">
                      <Phone size={9} />{t.phone}
                    </a>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Global support line */}
            <p className="mt-4 text-center text-[11px] text-gray-400">
              Need help? Call{' '}
              <a href={`tel:${t.phone.replace(/\s/g, '')}`}
                className="font-semibold text-indigo-600 hover:underline">
                {t.phone}
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LogIn;
