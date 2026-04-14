import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { CreditCard, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

export default function Subscription() {
  const { user } = useAuth();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/subscriptions/${user.user_id}`)
      .then(r => setSub(r.data.data))
      .catch(() => setSub(null))
      .finally(() => setLoading(false));
  }, [user]);

  const isExpired = sub && new Date(sub.expiry_date) < new Date();
  const daysLeft  = sub
    ? Math.max(0, Math.ceil((new Date(sub.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Subscription</h1>
        <p className="text-white/50 text-sm">Manage your Spiro subscription plan and balance.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !sub ? (
        <div className="glass p-10 text-center space-y-3">
          <AlertCircle size={40} className="text-yellow-400 mx-auto" />
          <p className="text-white font-semibold">No active subscription found.</p>
          <p className="text-white/40 text-sm">Contact your Spiro station to activate a plan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Plan Card */}
          <div className="glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-spiro-500 to-spiro-700 flex items-center justify-center">
                  <CreditCard size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">{sub.plan_type}</p>
                  <p className="text-white/40 text-xs">Subscription Plan</p>
                </div>
              </div>
              <span className={sub.is_active && !isExpired ? 'badge-green' : 'badge-red'}>
                {sub.is_active && !isExpired ? 'Active' : 'Expired'}
              </span>
            </div>

            {/* Balance */}
            <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white/50 text-xs mb-1">Current Balance</p>
                <p className="text-3xl font-bold text-[#C8F000]">
                  {parseFloat(sub.balance).toLocaleString()} <span className="text-lg text-white/50">RWF</span>
                </p>
              </div>
              {parseFloat(sub.balance) < 500 && (
                <div className="flex items-center gap-1.5 text-yellow-400 text-xs">
                  <AlertCircle size={14} />
                  Low Balance
                </div>
              )}
            </div>

            {/* Expiry */}
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={16} className="text-white/40" />
              <span className="text-white/60">
                Expires: <span className={isExpired ? 'text-red-400' : 'text-white'}>
                  {new Date(sub.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </span>
              {!isExpired && (
                <span className="text-white/30 text-xs">({daysLeft} day{daysLeft !== 1 ? 's' : ''} left)</span>
              )}
            </div>
          </div>

          {/* Info note */}
          <div className="glass p-4 flex items-start gap-3 text-sm text-white/50">
            <CheckCircle size={16} className="text-[#C8F000] mt-0.5 shrink-0" />
            <div>
              <p className="text-white/70 font-medium mb-1">How to top up your balance</p>
              <p>Visit any Spiro swapping station and pay via <span className="text-white">MTN Mobile Money</span> or <span className="text-white">Airtel Money</span>. The station agent will add the amount to your account immediately.</p>
            </div>
          </div>

          {/* Quick top-up amounts reference */}
          <div className="glass p-4 space-y-3">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Available Top-Up Packages</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { amount: '5,000', swaps: '~2 swaps' },
                { amount: '10,000', swaps: '~4 swaps' },
                { amount: '20,000', swaps: '~8 swaps' },
              ].map(pkg => (
                <div key={pkg.amount} className="bg-[#2B3EE6]/10 border border-[#2B3EE6]/30 rounded-xl p-3 text-center">
                  <p className="text-[#C8F000] font-bold text-sm">{pkg.amount} RWF</p>
                  <p className="text-white/40 text-xs mt-0.5">{pkg.swaps}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
