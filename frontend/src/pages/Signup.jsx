import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Zap, User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone_number: '', password: '', confirm: '' });
  const [showPwd,  setShowPwd]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/rider-signup`, {
        full_name:    form.full_name,
        email:        form.email,
        phone_number: form.phone_number || undefined,
        password:     form.password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
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

          {/* ── Success state ── */}
          {success ? (
            <div className="text-center space-y-5 py-2">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-[#C8F000]/10 border border-[#C8F000]/30 flex items-center justify-center">
                  <Clock size={36} className="text-[#C8F000]" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Account Pending Approval</h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  Your rider account has been created successfully!<br />
                  An admin will review and activate your account shortly.
                </p>
              </div>

              {/* Support box */}
              <div className="bg-[#2B3EE6]/10 border border-[#2B3EE6]/30 rounded-xl p-4 text-left space-y-1">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">Need faster access?</p>
                <p className="text-white/50 text-sm">You can contact your Spiro admin directly to request account activation.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => navigate('/login')} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
                  <CheckCircle size={15} />
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            /* ── Signup form ── */
            <>
              <div className="flex items-center gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Create Rider Account</h2>
                  <p className="text-white/40 text-xs mt-0.5">Your account will be reviewed by an admin.</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-sm">
                  <AlertCircle size={16} /><span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Full Name */}
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type="text" placeholder="Full Name" required
                    value={form.full_name} onChange={set('full_name')}
                    className="input-field pl-10" />
                </div>

                {/* Email */}
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type="email" placeholder="Email address" required
                    value={form.email} onChange={set('email')}
                    className="input-field pl-10" />
                </div>

                {/* Phone */}
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type="tel" placeholder="Phone Number (optional)"
                    value={form.phone_number} onChange={set('phone_number')}
                    className="input-field pl-10" />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type={showPwd ? 'text' : 'password'} placeholder="Password (min. 6 chars)" required
                    value={form.password} onChange={set('password')}
                    className="input-field pl-10 pr-12" />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type={showConf ? 'text' : 'password'} placeholder="Confirm Password" required
                    value={form.confirm} onChange={set('confirm')}
                    className="input-field pl-10 pr-12" />
                  <button type="button" onClick={() => setShowConf(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" disabled={loading} className="btn-primary mt-2">
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-[#0d1230]/30 border-t-[#0d1230] rounded-full animate-spin" />
                        Creating Account…
                      </span>
                    : 'Create Account →'}
                </button>
              </form>

              <div className="flex items-center justify-center mt-6 gap-2">
                <ArrowLeft size={13} className="text-white/30" />
                <Link to="/login" className="text-white/30 hover:text-white text-xs transition-colors">
                  Already have an account? Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
