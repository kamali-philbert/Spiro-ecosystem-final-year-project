import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function TopUpBalance() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const rider = state?.rider;

  const [subscription, setSubscription] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rider) {
      navigate('/cashier/rider-lookup');
      return;
    }
    fetchSubscription();
  }, [rider, navigate]);

  const fetchSubscription = async () => {
    try {
      const { data } = await api.get(`/subscriptions/${rider.user_id}`);
      if (data.status === 'success') {
        setSubscription(data.data);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError('Failed to fetch subscription');
      }
    }
  };

  const handleTopUp = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    setLoading(true);
    setError(null);
    try {
      if (subscription) {
        // top up existing
        await api.put(`/subscriptions/${subscription.subscription_id}/topup`, { amount: Number(amount) });
        setSuccess(true);
        fetchSubscription(); // refresh balance
      } else {
        // create new basic subscription
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1); // 1 year expiry
        await api.post('/subscriptions', {
          rider_id: rider.user_id,
          plan_type: 'PAYG',
          balance: Number(amount),
          expiry_date: expiry.toISOString().split('T')[0]
        });
        setSuccess(true);
        fetchSubscription();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process top-up');
    } finally {
      setLoading(false);
      setAmount('');
    }
  };

  if (!rider) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate('/cashier/rider-lookup')} className="flex items-center gap-2 text-[#aeb2d5] hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} /> Back to Lookup
      </button>

      <div className="bg-[#1a2255] border border-[#2B3EE6]/30 p-8 rounded-2xl">
        <div className="flex items-center gap-4 border-b border-[#2B3EE6]/30 pb-6 mb-6">
          <div className="w-14 h-14 rounded-full bg-[#2B3EE6]/20 flex items-center justify-center text-[#C8F000]">
            <CreditCard size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Top Up Balance</h1>
            <p className="text-[#aeb2d5] mt-1">{rider.full_name} ({rider.phone_number || rider.email})</p>
          </div>
        </div>

        <div className="bg-[#0cf]/10 border border-[#0cf]/20 p-4 rounded-xl mb-8 flex justify-between items-center">
          <span className="text-[#aeb2d5]">Current Balance:</span>
          <span className="text-2xl font-bold text-white">
            {subscription ? `${parseFloat(subscription.balance).toLocaleString()} RWF` : 'No Active Plan'}
          </span>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 text-green-400">
            <CheckCircle size={20} />
            <p>Top-up successful! Standard confirmation SMS/Email sent to rider.</p>
          </div>
        )}

        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">{error}</div>}

        <form onSubmit={handleTopUp} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#aeb2d5] mb-2">Amount (RWF)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setSuccess(false); }}
              placeholder="e.g. 5000"
              className="w-full bg-[#0d1230] border border-[#2B3EE6]/30 rounded-xl px-4 py-3 text-white focus:border-[#C8F000] focus:ring-1 focus:ring-[#C8F000]/50 transition-all outline-none"
              min="1"
              required
            />
          </div>
          <button type="submit" disabled={loading || !amount} className="w-full btn-primary py-3">
            {loading ? 'Processing...' : `Confirm Top-Up`}
          </button>
        </form>
      </div>
    </div>
  );
}
