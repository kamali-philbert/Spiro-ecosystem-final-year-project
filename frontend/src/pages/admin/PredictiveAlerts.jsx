import { useEffect, useState } from 'react';
import API from '../../services/api';
import { AlertTriangle, CheckCircle, RefreshCw, Zap } from 'lucide-react';

export default function PredictiveAlerts() {
  const [tickets,    setTickets]    = useState([]);
  const [batteries,  setBatteries]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [simBattery, setSimBattery] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simMsg,     setSimMsg]     = useState({ text: '', ok: true });

  const fetchTickets = () => {
    setLoading(true);
    API.get('/tickets')
      .then(r => {
        const ai = (r.data.data ?? []).filter(t =>
          t.issue_description?.includes('AI Predictive')
        );
        setTickets(ai);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
    API.get('/batteries').then(r => setBatteries(r.data.data ?? [])).catch(() => {});
  }, []);

  const simulateLowSoH = async () => {
    if (!simBattery) return;
    setSimLoading(true);
    setSimMsg({ text: '', ok: true });
    try {
      const res = await API.post('/telemetry', {
        battery_id:          parseInt(simBattery),
        voltage:             3.1,
        temperature:         60,
        current:             -2.5,
        internal_resistance: 9.5,
        soc:                 12,
      });
      const soh = res.data?.soh ?? '?';
      setSimMsg({ text: `Done — AI predicted SoH: ${soh}%. Alert ticket created. Refreshing...`, ok: true });
      setTimeout(() => { fetchTickets(); setSimMsg({ text: '', ok: true }); }, 2000);
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed. Make sure the AI service is running on port 8000.';
      setSimMsg({ text: msg, ok: false });
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Predictive Alerts</h1>
          <p className="text-white/50 text-sm">Batteries automatically flagged by the AI when SoH drops below 20%.</p>
        </div>
        <button onClick={fetchTickets} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Simulate Panel */}
      <div className="glass p-5 border border-yellow-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={15} className="text-yellow-400" />
          <p className="text-yellow-300 font-semibold text-sm">Simulate Low SoH Telemetry</p>
        </div>
        <p className="text-white/40 text-xs mb-4">
          Select a battery and send critical telemetry to trigger the AI pipeline and generate an alert ticket.
        </p>
        <div className="flex gap-3 flex-wrap">
          <select
            value={simBattery}
            onChange={e => setSimBattery(e.target.value)}
            className="bg-gray-900 border border-white/10 text-white text-sm rounded-lg px-3 py-2 flex-1 min-w-[200px]"
          >
            <option value="">Select a battery...</option>
            {batteries.map(b => (
              <option key={b.battery_id} value={b.battery_id}>
                #{b.battery_id} — {b.serial_number} ({b.status})
              </option>
            ))}
          </select>
          <button
            onClick={simulateLowSoH}
            disabled={!simBattery || simLoading}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-semibold text-sm px-5 py-2 rounded-lg transition"
          >
            {simLoading ? 'Sending...' : 'Send Low SoH Signal'}
          </button>
        </div>
        {simMsg.text && (
          <p className={`text-xs mt-3 ${simMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{simMsg.text}</p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass p-10 text-center">
          <CheckCircle size={40} className="text-spiro-400 mx-auto mb-3" />
          <p className="text-white font-medium">All Clear!</p>
          <p className="text-white/40 text-sm mt-1">No AI-generated maintenance alerts at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => {
            const resolved = t.status === 'RESOLVED';
            return (
              <div key={t.ticket_id} className={`glass p-5 border-l-4 ${resolved ? 'border-green-500' : 'border-red-500'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${resolved ? 'text-green-400' : 'text-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-white font-semibold text-sm">Battery #{t.battery_id} — Critical SoH</p>
                      <span className={resolved ? 'badge-green' : 'badge-red'}>{t.status}</span>
                    </div>
                    <p className="text-white/60 text-sm">{t.issue_description}</p>
                    <p className="text-white/30 text-xs mt-2">
                      SoH at alert: <span className="text-red-400">{t.soh_before}%</span> | Ticket #{t.ticket_id} | Created: {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
