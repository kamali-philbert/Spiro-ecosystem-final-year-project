import { useEffect, useState } from 'react';
import API from '../../services/api';
import { AlertTriangle, CheckCircle, RefreshCw, Zap, Wrench, UserCheck, Clock } from 'lucide-react';

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
            const resolved   = t.status === 'RESOLVED';
            const inProgress = t.status === 'IN_PROGRESS';
            const open       = t.status === 'OPEN';

            const borderColor = resolved ? 'border-green-500' : inProgress ? 'border-yellow-500' : 'border-red-500';
            const iconColor   = resolved ? 'text-green-400'  : inProgress ? 'text-yellow-400'  : 'text-red-400';

            return (
              <div key={t.ticket_id} className={`glass p-5 border-l-4 ${borderColor}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${iconColor}`} />
                  <div className="flex-1 min-w-0">

                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">
                        Battery #{t.battery_id}
                        {t.battery_serial && <span className="text-white/40 font-normal"> · {t.battery_serial}</span>}
                      </p>
                      {open       && <span className="bg-red-500/15 text-red-400 text-xs px-2 py-0.5 rounded-full font-semibold">⚠ CRITICAL — Awaiting Technician</span>}
                      {inProgress && <span className="bg-yellow-500/15 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-semibold">🔧 IN PROGRESS</span>}
                      {resolved   && <span className="bg-green-500/15 text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold">✓ RESOLVED</span>}
                    </div>

                    <p className="text-white/60 text-xs mb-3">{t.issue_description}</p>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white/5 rounded-lg px-3 py-2">
                        <p className="text-white/30 text-xs mb-0.5">SoH at Alert</p>
                        <p className="text-red-400 font-bold text-sm">{t.soh_before}%</p>
                      </div>

                      <div className="bg-white/5 rounded-lg px-3 py-2">
                        <p className="text-white/30 text-xs mb-0.5">Ticket #</p>
                        <p className="text-white font-semibold text-sm">#{t.ticket_id}</p>
                      </div>

                      {/* Technician notified */}
                      <div className={`rounded-lg px-3 py-2 ${t.technician_name ? 'bg-[#2B3EE6]/15 border border-[#2B3EE6]/30' : 'bg-white/5'}`}>
                        <p className="text-white/30 text-xs mb-0.5 flex items-center gap-1">
                          <UserCheck size={10} /> Technician Notified
                        </p>
                        <p className={`font-semibold text-sm ${t.technician_name ? 'text-[#C8F000]' : 'text-white/30'}`}>
                          {t.technician_name || 'None assigned'}
                        </p>
                      </div>

                      {/* Resolved SoH or created date */}
                      {resolved ? (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                          <p className="text-white/30 text-xs mb-0.5 flex items-center gap-1">
                            <Wrench size={10} /> SoH After Repair
                          </p>
                          <p className="text-green-400 font-bold text-sm">{t.soh_after ?? '—'}%</p>
                        </div>
                      ) : (
                        <div className="bg-white/5 rounded-lg px-3 py-2">
                          <p className="text-white/30 text-xs mb-0.5 flex items-center gap-1">
                            <Clock size={10} /> Alerted
                          </p>
                          <p className="text-white/60 text-sm">{new Date(t.created_at).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {/* Resolved summary */}
                    {resolved && t.resolved_at && (
                      <p className="text-green-400/60 text-xs mt-2">
                        ✓ Resolved on {new Date(t.resolved_at).toLocaleString()} · Battery returned to station as AVAILABLE
                      </p>
                    )}
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
