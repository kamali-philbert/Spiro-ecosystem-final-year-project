import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';

const ROLE_ROUTES = {
  RIDER:      '/rider/dashboard',
  TECHNICIAN: '/technician/portal',
  ADMIN:      '/admin/dashboard',
  CASHIER:    '/cashier/dashboard',
};

export default function Login() {
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // step: 'credentials' | 'otp'
  const [step,     setStep]     = useState('credentials');
  const [form,     setForm]     = useState({ email: '', password: '' });
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [info,     setInfo]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [userId,   setUserId]   = useState(null);
  const [otp,      setOtp]      = useState(['', '', '', '', '', '']);
  const [resendCd, setResendCd] = useState(0);
  const inputRefs = useRef([]);

  // Resend countdown
  useEffect(() => {
    if (resendCd <= 0) return;
    const t = setTimeout(() => setResendCd(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCd]);

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const handleCredentials = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await login(form.email, form.password);
      setUserId(data.user_id);
      setInfo(data.message);
      setStep('otp');
      setResendCd(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Login failed. Please try again.';
      // Friendlier message for inactive (pending approval) accounts
      if (err.response?.status === 403) {
        setError('Your account is pending admin approval. Contact your Spiro admin to activate it.');
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
  };

  // ── OTP input helpers ─────────────────────────────────────────────────────
  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split('')); inputRefs.current[5]?.focus(); }
  };

  // ── Step 2 ────────────────────────────────────────────────────────────────
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
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally { setLoading(false); }
  };

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCd > 0) return;
    setError(''); setLoading(true);
    try {
      const data = await login(form.email, form.password);
      setInfo(data.message);
      setOtp(['', '', '', '', '', '']);
      setResendCd(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch { setError('Failed to resend code.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #080c1a 0%, #0d1230 60%, #080c1a 100%)' }}>

      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#2B3EE6]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#C8F000]/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2B3EE6] shadow-xl mb-4">
            <Zap size={28} className="text-[#C8F000]" />
          </div>
          <h1 className="text-3xl font-bold text-[#C8F000] mb-1">spiro</h1>
          <p className="text-white/50 text-sm">AI-Powered Battery Management</p>
        </div>

        <div className="glass p-8 border border-[#2B3EE6]/30">

          {/* ── STEP 1: Email + Password ── */}
          {step === 'credentials' && (
            <>
              <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>

              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-sm">
                  <AlertCircle size={16} /><span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCredentials} className="flex flex-col gap-4">
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type="email" placeholder="Email address" required
                    value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="input-field pl-10" />
                </div>

                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type={showPwd ? 'text' : 'password'} placeholder="Password" required
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="input-field pl-10 pr-12" />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" disabled={loading} className="btn-primary mt-2">
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-[#0d1230]/30 border-t-[#0d1230] rounded-full animate-spin" />
                        Verifying…
                      </span>
                    : 'Continue →'}
                </button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-white/30 text-xs">Are you a rider?</p>
                <Link to="/signup"
                  className="inline-flex items-center gap-1.5 text-[#C8F000]/70 hover:text-[#C8F000] text-sm font-medium transition-colors">
                  Create Rider Account →
                </Link>
              </div>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 'otp' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#2B3EE6]/30 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} className="text-[#C8F000]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Check your email</h2>
                  <p className="text-white/40 text-xs mt-0.5">{info}</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-sm">
                  <AlertCircle size={16} /><span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="flex flex-col gap-6">
                {/* 6 OTP boxes */}
                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                  {otp.map((digit, i) => (
                    <input key={i}
                      ref={el => inputRefs.current[i] = el}
                      type="text" inputMode="numeric" maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-11 h-14 text-center text-xl font-bold rounded-xl border bg-white/5 text-white focus:outline-none transition-all duration-150"
                      style={{
                        borderColor: digit ? '#C8F000' : 'rgba(255,255,255,0.1)',
                        boxShadow:   digit ? '0 0 0 1px #C8F000' : 'none',
                      }}
                    />
                  ))}
                </div>

                <button type="submit" disabled={loading || otp.join('').length < 6} className="btn-primary">
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-[#0d1230]/30 border-t-[#0d1230] rounded-full animate-spin" />
                        Verifying…
                      </span>
                    : 'Verify & Sign In'}
                </button>
              </form>

              <div className="flex items-center justify-between mt-5">
                <button onClick={() => { setStep('credentials'); setError(''); setOtp(['','','','','','']); }}
                  className="text-white/30 hover:text-white text-xs transition">
                  ← Back
                </button>
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
  );
}
