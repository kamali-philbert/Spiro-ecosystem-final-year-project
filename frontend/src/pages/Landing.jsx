import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck,
         Battery, MapPin, Repeat, Brain, ChevronDown, ArrowRight, Menu, X } from 'lucide-react';
import API from '../services/api';

const ROLE_ROUTES = {
  RIDER:      '/rider/dashboard',
  TECHNICIAN: '/technician/portal',
  CASHIER:    '/cashier/dashboard',
  ADMIN:      '/admin/dashboard',
};

// ── Image carousel slides ────────────────────────────────────────────────────
// Drop your real photos in frontend/public/images/ with these names.
// Unsplash URLs are fallbacks shown until local images exist.
const SLIDES = [
  {
    bg: '#1a2a6c',
    label: "Africa's Largest Electric Vehicle Player",
    sub: 'Powering the future of clean mobility across Africa',
    img: '/images/hero-1.jpg.png',
    fallback: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  },
  {
    bg: '#0d1230',
    label: 'Smart Battery Swap Stations',
    sub: 'Swap your battery in under 3 minutes — zero downtime, zero fuel',
    img: '/images/hero-2.jpg.png',
    fallback: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80',
  },
  {
    bg: '#0a1a0a',
    label: 'AI-Powered Fleet Management',
    sub: 'Real-time battery health monitoring and predictive maintenance',
    img: '/images/hero-3.jpg.png',
    fallback: 'https://images.unsplash.com/photo-1620714223084-8fcacc2dfd4d?w=800&q=80',
  },
];

const FEATURES = [
  { icon: Repeat,   title: 'Instant Battery Swap',     desc: 'Swap a depleted battery for a fully charged one in under 3 minutes at any Spiro station.' },
  { icon: Brain,    title: 'AI Health Monitoring',     desc: 'Our AI engine continuously monitors battery State of Health and predicts failures before they happen.' },
  { icon: MapPin,   title: 'Station Network',          desc: 'A growing network of smart swap stations across Rwanda and Africa, always near you.' },
  { icon: Battery,  title: 'Long-Range Batteries',     desc: 'High-capacity batteries engineered for African roads — reliable, durable, and efficient.' },
  { icon: Zap,      title: 'Zero Fuel Costs',          desc: 'Say goodbye to petrol. Ride electric and save up to 60% on energy costs every month.' },
  { icon: ShieldCheck, title: 'Secure & Transparent', desc: 'Every swap is logged, every battery tracked. Full transparency for riders and fleet managers.' },
];

export default function Landing() {
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // Carousel
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Login form
  const [step,     setStep]     = useState('credentials');
  const [form,     setForm]     = useState({ email: '', password: '' });
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [info,     setInfo]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [userId,   setUserId]   = useState(null);
  const [otp,      setOtp]      = useState(['','','','','','']);
  const [resendCd, setResendCd] = useState(0);
  const inputRefs = useRef([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (resendCd <= 0) return;
    const t = setTimeout(() => setResendCd(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCd]);

  const handleCredentials = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await login(form.email, form.password);
      setUserId(data.user_id); setInfo(data.message);
      setStep('otp'); setResendCd(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };
  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setOtp(p.split('')); inputRefs.current[5]?.focus(); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Enter the full 6-digit code.'); return; }
    setError(''); setLoading(true);
    try {
      const user = await verifyOtp(userId, code);
      navigate(ROLE_ROUTES[user.role] ?? '/');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Invalid or expired code.');
      setOtp(['','','','','','']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCd > 0) return;
    setError(''); setLoading(true);
    try {
      const data = await login(form.email, form.password);
      setInfo(data.message); setOtp(['','','','','','']); setResendCd(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch { setError('Failed to resend code.'); }
    finally { setLoading(false); }
  };

  const cur = SLIDES[slide];

  return (
    <div className="min-h-screen font-sans" style={{ background: '#080c1a', color: '#fff' }}>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(8,12,26,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(43,62,230,0.2)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2B3EE6] flex items-center justify-center">
            <Zap size={16} className="text-[#C8F000]" />
          </div>
          <div>
            <span className="text-[#C8F000] font-black text-lg leading-none">spiro</span>
            <p className="text-white/30 text-xs leading-none">An Equitane group company</p>
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
          <a href="#about"    className="hover:text-white transition">About</a>
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#how"      className="hover:text-white transition">How It Works</a>
          <a href="#signin"   className="bg-[#C8F000] text-[#0d1230] font-bold px-4 py-2 rounded-xl hover:bg-[#d4f520] transition text-xs">
            Sign In
          </a>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden text-white/60 hover:text-white" onClick={() => setMenuOpen(m => !m)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-[#0d1230] border-b border-[#2B3EE6]/20 px-6 py-4 flex flex-col gap-4 md:hidden">
          {['About','Features','How It Works'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`}
              onClick={() => setMenuOpen(false)}
              className="text-white/60 hover:text-white text-sm transition">{l}</a>
          ))}
          <a href="#signin" onClick={() => setMenuOpen(false)}
            className="bg-[#C8F000] text-[#0d1230] font-bold px-4 py-2 rounded-xl text-sm text-center">Sign In</a>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="min-h-screen flex flex-col lg:flex-row pt-16">

        {/* Left — carousel */}
        <div className="relative flex-1 flex flex-col justify-center overflow-hidden min-h-[60vh] lg:min-h-screen"
          style={{ background: `linear-gradient(135deg, ${cur.bg} 0%, #0d1230 100%)`, transition: 'background 1s' }}>

          {/* Animated background glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-[#2B3EE6]/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#C8F000]/10 rounded-full blur-3xl" />
            {/* Hero background image */}
            <img src={cur.img} onError={e => { e.target.src = cur.fallback; }}
              alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          </div>

          <div className="relative z-10 px-10 lg:px-16 py-16">
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 bg-[#C8F000]/10 border border-[#C8F000]/20 rounded-full px-4 py-1.5 mb-6">
              <Zap size={12} className="text-[#C8F000]" />
              <span className="text-[#C8F000] text-xs font-semibold">Energy on the move</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-black text-white leading-tight mb-4"
              style={{ transition: 'all 0.5s' }}>
              {cur.label.split(' ').map((w, i) => (
                <span key={i} className={i % 3 === 1 ? 'text-[#C8F000]' : ''}>{w} </span>
              ))}
            </h1>

            <p className="text-white/60 text-lg mb-8 max-w-lg">{cur.sub}</p>

            <div className="flex gap-3 flex-wrap">
              <a href="#signin"
                className="bg-[#C8F000] text-[#0d1230] font-bold px-6 py-3 rounded-xl hover:bg-[#d4f520] transition flex items-center gap-2">
                Get Started <ArrowRight size={16} />
              </a>
              <a href="#about"
                className="border border-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/10 transition">
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-12 flex-wrap">
              {[
                { value: '50,000+', label: 'Active Riders' },
                { value: '500+',    label: 'Swap Stations' },
                { value: '10+',     label: 'Countries' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-black text-[#C8F000]">{s.value}</p>
                  <p className="text-white/40 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Slide indicators */}
          <div className="absolute bottom-8 left-16 flex gap-2">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)}
                className="rounded-full transition-all duration-300"
                style={{ width: i === slide ? 24 : 8, height: 8, background: i === slide ? '#C8F000' : 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>
        </div>

        {/* Right — Sign In form */}
        <div id="signin" className="w-full lg:w-[420px] flex items-center justify-center p-8 lg:p-12"
          style={{ background: 'rgba(13,18,48,0.95)', borderLeft: '1px solid rgba(43,62,230,0.2)' }}>
          <div className="w-full max-w-sm">

            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2B3EE6] shadow-xl mb-3 overflow-hidden">
                <img src="/images/logo.png.png"
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                  alt="Spiro" className="w-full h-full object-contain p-1" />
                <Zap size={24} className="text-[#C8F000]" style={{display:'none'}} />
              </div>
              <h2 className="text-2xl font-black text-[#C8F000]">spiro</h2>
              <p className="text-white/40 text-xs mt-1">Intelligent Battery Ecosystem</p>
            </div>

            <div className="bg-white/5 border border-[#2B3EE6]/30 rounded-2xl p-6">

              {/* Step 1 */}
              {step === 'credentials' && (
                <>
                  <h3 className="text-white font-semibold text-lg mb-5">Sign In</h3>
                  {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4 text-xs">
                      <AlertCircle size={14} /><span>{error}</span>
                    </div>
                  )}
                  <form onSubmit={handleCredentials} className="flex flex-col gap-3">
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input type="email" placeholder="Email address" required
                        value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="input-field pl-9 text-sm py-2.5" />
                    </div>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input type={showPwd ? 'text' : 'password'} placeholder="Password" required
                        value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        className="input-field pl-9 pr-10 text-sm py-2.5" />
                      <button type="button" onClick={() => setShowPwd(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary mt-1 py-2.5 text-sm">
                      {loading
                        ? <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-[#0d1230]/30 border-t-[#0d1230] rounded-full animate-spin" />
                            Verifying…
                          </span>
                        : <span className="flex items-center justify-center gap-2">Continue <ArrowRight size={14} /></span>}
                    </button>
                  </form>
                  <p className="text-center text-white/25 text-xs mt-4">
                    Contact Admin to create your account.
                  </p>
                </>
              )}

              {/* Step 2 — OTP */}
              {step === 'otp' && (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#2B3EE6]/30 flex items-center justify-center shrink-0">
                      <ShieldCheck size={18} className="text-[#C8F000]" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Check your email</h3>
                      <p className="text-white/40 text-xs">{info}</p>
                    </div>
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4 text-xs">
                      <AlertCircle size={14} /><span>{error}</span>
                    </div>
                  )}
                  <form onSubmit={handleVerify} className="flex flex-col gap-5">
                    <div className="flex gap-1.5 justify-center" onPaste={handlePaste}>
                      {otp.map((digit, i) => (
                        <input key={i} ref={el => inputRefs.current[i] = el}
                          type="text" inputMode="numeric" maxLength={1} value={digit}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          className="w-10 h-12 text-center text-lg font-bold rounded-xl border bg-white/5 text-white focus:outline-none transition-all"
                          style={{ borderColor: digit ? '#C8F000' : 'rgba(255,255,255,0.1)', boxShadow: digit ? '0 0 0 1px #C8F000' : 'none' }}
                        />
                      ))}
                    </div>
                    <button type="submit" disabled={loading || otp.join('').length < 6} className="btn-primary py-2.5 text-sm">
                      {loading
                        ? <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-[#0d1230]/30 border-t-[#0d1230] rounded-full animate-spin" />
                            Verifying…
                          </span>
                        : 'Verify & Sign In'}
                    </button>
                  </form>
                  <div className="flex items-center justify-between mt-4">
                    <button onClick={() => { setStep('credentials'); setError(''); setOtp(['','','','','','']); }}
                      className="text-white/30 hover:text-white text-xs transition">← Back</button>
                    <button onClick={handleResend} disabled={resendCd > 0 || loading}
                      className="text-xs text-[#C8F000]/70 hover:text-[#C8F000] disabled:opacity-40 disabled:cursor-not-allowed transition">
                      {resendCd > 0 ? `Resend in ${resendCd}s` : 'Resend code'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Scroll hint */}
      <div className="flex justify-center py-4 animate-bounce">
        <ChevronDown size={24} className="text-white/20" />
      </div>

      {/* ── ABOUT ── */}
      <section id="about" className="py-20 px-6 lg:px-20"
        style={{ background: 'linear-gradient(180deg, #080c1a 0%, #0d1230 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#2B3EE6]/20 border border-[#2B3EE6]/30 rounded-full px-4 py-1.5 mb-4">
                <span className="text-[#C8F000] text-xs font-semibold">About Spiro</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-white mb-4 leading-tight">
                Powering Africa's <span className="text-[#C8F000]">Electric Revolution</span>
              </h2>
              <p className="text-white/60 leading-relaxed mb-4">
                Spiro is Africa's largest electric vehicle company, part of the Equitane Group. We provide affordable, reliable electric motorcycles and a smart battery swap network that eliminates range anxiety and fuel costs for riders across the continent.
              </p>
              <p className="text-white/60 leading-relaxed mb-6">
                Our AI-powered Intelligent Battery Ecosystem monitors every battery in real time — predicting failures, optimizing swaps, and ensuring riders always have a fully charged battery ready when they need it.
              </p>
              <div className="flex gap-4 flex-wrap">
                {[
                  { v: 'Rwanda', l: 'Headquarters' },
                  { v: '2019',   l: 'Founded' },
                  { v: '10+',    l: 'Countries' },
                ].map(s => (
                  <div key={s.l} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
                    <p className="text-[#C8F000] font-black text-lg">{s.v}</p>
                    <p className="text-white/40 text-xs">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Image grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl overflow-hidden h-48 bg-[#2B3EE6]/20 col-span-2">
                <img src="/images/about-main.jpg.png"
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'; }}
                  alt="Spiro station" className="w-full h-full object-cover opacity-80" />
              </div>
              <div className="rounded-2xl overflow-hidden h-36 bg-[#2B3EE6]/20">
                <img src="/images/about-bike.jpg.png"
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&q=80'; }}
                  alt="Electric bike" className="w-full h-full object-cover opacity-80" />
              </div>
              <div className="rounded-2xl overflow-hidden h-36 bg-[#C8F000]/10">
                <img src="/images/about-battery.jpg.png"
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1620714223084-8fcacc2dfd4d?w=400&q=80'; }}
                  alt="Battery" className="w-full h-full object-cover opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 px-6 lg:px-20" style={{ background: '#080c1a' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#C8F000]/10 border border-[#C8F000]/20 rounded-full px-4 py-1.5 mb-4">
              <span className="text-[#C8F000] text-xs font-semibold">Why Spiro</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white">
              Everything you need to <span className="text-[#C8F000]">ride smarter</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#2B3EE6]/50 hover:bg-[#2B3EE6]/10 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-[#2B3EE6]/20 flex items-center justify-center mb-4 group-hover:bg-[#C8F000]/20 transition-colors">
                  <Icon size={20} className="text-[#C8F000]" />
                </div>
                <h3 className="text-white font-bold mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-20 px-6 lg:px-20"
        style={{ background: 'linear-gradient(180deg, #080c1a 0%, #0d1230 100%)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#2B3EE6]/20 border border-[#2B3EE6]/30 rounded-full px-4 py-1.5 mb-4">
            <span className="text-[#C8F000] text-xs font-semibold">How It Works</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-black text-white mb-12">
            Swap in <span className="text-[#C8F000]">3 simple steps</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: MapPin,  title: 'Find a Station',    desc: 'Open the app and locate the nearest Spiro swap station on the map.' },
              { step: '02', icon: Repeat,  title: 'Scan & Swap',       desc: 'Scan your battery QR code, hand it in, and receive a fully charged one instantly.' },
              { step: '03', icon: Zap,     title: 'Ride & Go',         desc: 'Snap in your new battery and get back on the road — fully charged, zero waiting.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-5xl font-black text-[#2B3EE6]/30 mb-3">{step}</div>
                <div className="w-10 h-10 rounded-xl bg-[#C8F000]/15 flex items-center justify-center mb-3">
                  <Icon size={20} className="text-[#C8F000]" />
                </div>
                <h3 className="text-white font-bold mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-6 lg:px-20 border-t border-white/10"
        style={{ background: '#080c1a' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2B3EE6] flex items-center justify-center">
              <Zap size={13} className="text-[#C8F000]" />
            </div>
            <div>
              <span className="text-[#C8F000] font-black text-sm">spiro</span>
              <p className="text-white/30 text-xs">An Equitane group company</p>
            </div>
          </div>
          <p className="text-white/30 text-xs text-center">
            © {new Date().getFullYear()} Spiro. All rights reserved. | Kigali, Rwanda
          </p>
          <p className="text-white/20 text-xs">Energy on the move ⚡</p>
        </div>
      </footer>
    </div>
  );
}
