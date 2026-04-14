import { useEffect, useState } from 'react';
import API from '../../services/api';
import { CreditCard, Plus, X, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

const PLANS = ['Standard Plan', 'Premium Plan', 'Basic Plan'];
const EMPTY = { rider_id: '', plan_type: 'Standard Plan', balance: '', expiry_date: '' };

export default function SubscriptionManagement() {
  const [subs,       setSubs]       = useState([]);
  const [riders,     setRiders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [feedback,   setFeedback]   = useState(null);
  const [topUpId,    setTopUpId]    = useState(null);
  const [topUpAmt,   setTopUpAmt]   = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = () => {
    Promise.all([
      API.get('/subscriptions'),
      API.get('/admin/users'),
    ]).then(([sRes, uRes]) => {
      setSubs(sRes.data.data ?? []);
      // Only riders need subscriptions
      setRiders((uRes.data.data ?? []).filter(u => u.role === 'RIDER'));
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFeedback(null);
    try {
      await API.post('/subscriptions', {
        ...form,
        rider_id: parseInt(form.rider_id),
        balance:  parseFloat(form.balance),
      });
      setFeedback({ type: 'success', msg: 'Subscription created successfully.' });
      setForm(EMPTY);
      load();
      setTimeout(() => { setShowModal(false); setFeedback(null); }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message ?? 'Failed to create subscription.' });
    } finally { setSubmitting(false); }
  };

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this subscription?')) return;
    await API.delete(`/subscriptions/${id}`);
    load();
  };

  const handleTopUp = async (id) => {
    if (!topUpAmt || parseFloat(topUpAmt) <= 0) return;
    setTopUpLoading(true);
    try {
      await API.put(`/subscriptions/${id}/topup`, { amount: parseFloat(topUpAmt) });
      setTopUpId(null); setTopUpAmt('');
      load();
    } catch { } finally { setTopUpLoading(false); }
  };

  const closeModal = () => { setShowModal(false); setForm(EMPTY); setFeedback(null); };

  // Default expiry = 1 year from today
  const defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
          <p className="text-white/50 text-sm">Manage rider subscription plans and balances.</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY, expiry_date: defaultExpiry }); setShowModal(true); }}
          className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Subscription
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr>
                {['ID', 'Rider', 'Plan', 'Balance (RWF)', 'Expiry', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(s => {
                const expired = new Date(s.expiry_date) < new Date();
                return (
                  <tr key={s.subscription_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-white/50">{s.subscription_id}</td>
                    <td className="px-5 py-3">
                      <p className="text-white font-medium">{s.full_name}</p>
                      <p className="text-white/40 text-xs">{s.email}</p>
                    </td>
                    <td className="px-5 py-3 text-white/70">{s.plan_type}</td>
                    <td className="px-5 py-3">
                      <span className={`font-bold ${parseFloat(s.balance) < 500 ? 'text-yellow-400' : 'text-spiro-400'}`}>
                        {parseFloat(s.balance).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/60">
                      {new Date(s.expiry_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={s.is_active && !expired ? 'badge-green' : 'badge-red'}>
                        {s.is_active && !expired ? 'Active' : expired ? 'Expired' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {topUpId === s.subscription_id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min="100" step="100" placeholder="Amount"
                              value={topUpAmt} onChange={e => setTopUpAmt(e.target.value)}
                              className="w-24 bg-gray-900 border border-white/10 text-white text-xs rounded-lg px-2 py-1"
                            />
                            <button onClick={() => handleTopUp(s.subscription_id)}
                              disabled={topUpLoading}
                              className="bg-[#C8F000] text-black text-xs font-bold px-2 py-1 rounded-lg disabled:opacity-50">
                              {topUpLoading ? '...' : 'Add'}
                            </button>
                            <button onClick={() => { setTopUpId(null); setTopUpAmt(''); }}
                              className="text-white/30 hover:text-white"><X size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setTopUpId(s.subscription_id)}
                            className="text-xs bg-[#C8F000]/10 text-[#C8F000] border border-[#C8F000]/20 px-3 py-1 rounded-lg hover:bg-[#C8F000]/20 transition">
                            Top Up
                          </button>
                        )}
                        <button onClick={() => deactivate(s.subscription_id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {subs.length === 0 && (
            <p className="text-center text-white/30 py-10">No subscriptions yet.</p>
          )}
          {subs.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
              <p className="text-white/40 text-xs">
                Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, subs.length)} of {subs.length}
              </p>
              <div className="flex gap-2">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                  className="px-3 py-1 text-xs rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                  Prev
                </button>
                <button disabled={page*PAGE_SIZE>=subs.length} onClick={() => setPage(p=>p+1)}
                  className="px-3 py-1 text-xs rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Create Subscription</h2>
                <p className="text-white/40 text-xs mt-0.5">Assign a plan to a rider.</p>
              </div>
              <button onClick={closeModal} className="text-white/30 hover:text-white"><X size={20} /></button>
            </div>

            {feedback && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${
                feedback.type === 'success' ? 'bg-spiro-500/10 text-spiro-400 border-spiro-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {feedback.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {feedback.msg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Rider</label>
                <select value={form.rider_id} onChange={e => setForm(p => ({ ...p, rider_id: e.target.value }))}
                  className="input-field bg-gray-900 text-white" required>
                  <option value="" className="bg-gray-900">-- Select Rider --</option>
                  {riders.map(r => (
                    <option key={r.user_id} value={r.user_id} className="bg-gray-900">
                      {r.full_name} ({r.email})
                    </option>
                  ))}
                </select>
                {riders.length === 0 && (
                  <p className="text-yellow-400 text-xs mt-1">No riders found. Create a rider account first.</p>
                )}
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Plan Type</label>
                <select value={form.plan_type} onChange={e => setForm(p => ({ ...p, plan_type: e.target.value }))}
                  className="input-field bg-gray-900 text-white">
                  {PLANS.map(p => <option key={p} value={p} className="bg-gray-900">{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Initial Balance (RWF)</label>
                <input type="number" min="0" step="100" placeholder="e.g. 50000" required
                  value={form.balance} onChange={e => setForm(p => ({ ...p, balance: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Expiry Date</label>
                <input type="date" required
                  value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))}
                  className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={15} />}
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
