import { useEffect, useState } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  CheckSquare, Square, AlertTriangle, RefreshCw, Printer,
  Battery, Thermometer, Zap, Shield, Wrench, CheckCircle, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Diagnostic check items per battery ──────────────────────────────────────
const CHECKS = [
  { id: 'voltage',     icon: Zap,         label: 'Voltage Test',           desc: 'Measure open-circuit voltage. Should be within spec range.' },
  { id: 'temperature', icon: Thermometer, label: 'Temperature Check',      desc: 'Verify battery temperature is within safe operating range (15–45°C).' },
  { id: 'physical',    icon: Shield,      label: 'Physical Inspection',    desc: 'Check for cracks, swelling, corrosion, or damaged terminals.' },
  { id: 'capacity',    icon: Battery,     label: 'Capacity Test',          desc: 'Run discharge cycle to verify actual capacity vs rated capacity.' },
  { id: 'resistance',  icon: Wrench,      label: 'Internal Resistance',    desc: 'Measure internal resistance. High resistance indicates degradation.' },
  { id: 'connectors',  icon: Zap,         label: 'Connector & Cable Check', desc: 'Inspect all connectors and cables for wear, looseness, or damage.' },
  { id: 'bms',         icon: Shield,      label: 'BMS Functionality',      desc: 'Verify Battery Management System is responding and logging correctly.' },
  { id: 'charge',      icon: Battery,     label: 'Charge Cycle Test',      desc: 'Perform a full charge cycle and verify charge acceptance.' },
];

const SOH_COLOR = (v) => v < 20 ? 'text-red-400' : v < 50 ? 'text-yellow-400' : 'text-[#C8F000]';
const SOH_BG    = (v) => v < 20 ? 'bg-red-500'   : v < 50 ? 'bg-yellow-400'   : 'bg-[#C8F000]';

export default function MaintenanceChecklist() {
  const { user } = useAuth();
  const [batteries,  setBatteries]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState({});   // { batteryId: bool }
  const [checks,     setChecks]     = useState({});   // { batteryId: { checkId: bool } }
  const [notes,      setNotes]      = useState({});   // { batteryId: string }
  const [completed,  setCompleted]  = useState({});   // { batteryId: { timestamp, tech } }
  const [saving,     setSaving]     = useState({});

  const fetchBatteries = async () => {
    setLoading(true);
    try {
      const res = await API.get('/batteries');
      const flagged = (res.data.data ?? []).filter(
        b => b.status === 'FLAGGED' || b.status === 'END_OF_LIFE' || b.state_of_health < 30
      );
      setBatteries(flagged);
      // Auto-expand first battery
      if (flagged.length > 0) {
        setExpanded({ [flagged[0].battery_id]: true });
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBatteries(); }, []);

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const toggleCheck = (batteryId, checkId) => {
    setChecks(p => ({
      ...p,
      [batteryId]: { ...(p[batteryId] ?? {}), [checkId]: !(p[batteryId]?.[checkId]) }
    }));
  };

  const getCheckedCount = (batteryId) =>
    Object.values(checks[batteryId] ?? {}).filter(Boolean).length;

  const allChecked = (batteryId) => getCheckedCount(batteryId) === CHECKS.length;

  const handleComplete = async (battery) => {
    const id = battery.battery_id;
    if (!allChecked(id)) return;
    setSaving(p => ({ ...p, [id]: true }));
    try {
      await API.put(`/batteries/${id}/status`, { status: 'AVAILABLE' });
      setCompleted(p => ({
        ...p,
        [id]: { timestamp: new Date().toLocaleString('en-GB'), tech: user?.full_name }
      }));
    } catch {}
    finally { setSaving(p => ({ ...p, [id]: false })); }
  };

  const totalChecks   = batteries.length * CHECKS.length;
  const doneChecks    = batteries.reduce((sum, b) => sum + getCheckedCount(b.battery_id), 0);
  const completedBats = Object.keys(completed).length;
  const progress      = totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0;

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Digital Diagnostic Checklist</h1>
          <p className="text-white/50 text-sm mt-1">
            Systematic inspection for flagged and degraded batteries.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint}
            className="btn-secondary flex items-center gap-2 text-sm">
            <Printer size={15} /> Print Report
          </button>
          <button onClick={fetchBatteries}
            className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Batteries to Inspect', value: batteries.length,  color: 'text-yellow-400' },
          { label: 'Checks Completed',     value: `${doneChecks}/${totalChecks}`, color: 'text-[#C8F000]' },
          { label: 'Fully Inspected',      value: completedBats,     color: 'text-green-400' },
          { label: 'Technician',           value: user?.full_name?.split(' ')[0] ?? '—', color: 'text-white' },
        ].map(c => (
          <div key={c.label} className="glass px-4 py-3">
            <p className="text-white/40 text-xs">{c.label}</p>
            <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      {batteries.length > 0 && (
        <div className="glass p-4">
          <div className="flex justify-between text-sm text-white/60 mb-2">
            <span>Overall Inspection Progress</span>
            <span className="text-[#C8F000] font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2.5">
            <div className="h-2.5 rounded-full transition-all duration-500 bg-[#C8F000]"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Battery list */}
      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-8 h-8 border-2 border-[#2B3EE6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : batteries.length === 0 ? (
        <div className="glass p-12 flex flex-col items-center gap-3 text-center">
          <CheckCircle size={44} className="text-[#C8F000]" />
          <p className="text-white font-semibold text-lg">All batteries are healthy!</p>
          <p className="text-white/40 text-sm">No flagged or degraded batteries require inspection.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batteries.map(b => {
            const isExpanded  = !!expanded[b.battery_id];
            const isDone      = !!completed[b.battery_id];
            const checkedCount = getCheckedCount(b.battery_id);
            const allDone     = allChecked(b.battery_id);
            const sohPct      = parseFloat(b.state_of_health);

            return (
              <div key={b.battery_id}
                className={`glass overflow-hidden transition-all duration-300 ${isDone ? 'border border-green-500/30' : b.status === 'END_OF_LIFE' ? 'border border-red-500/20' : 'border border-yellow-500/20'}`}>

                {/* Battery header row — click to expand */}
                <button onClick={() => toggleExpand(b.battery_id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left">

                  {/* Status icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDone ? 'bg-green-500/20' : 'bg-yellow-500/10'}`}>
                    {isDone
                      ? <CheckCircle size={18} className="text-green-400" />
                      : <AlertTriangle size={18} className="text-yellow-400" />}
                  </div>

                  {/* Battery info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">
                        Battery #{b.battery_id}
                      </p>
                      <span className="text-white/40 font-mono text-xs">{b.serial_number}</span>
                      <span className={b.status === 'END_OF_LIFE' ? 'badge-red' : 'badge-yellow'}>
                        {b.status}
                      </span>
                      {isDone && <span className="badge-green">Inspected</span>}
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">{b.model}</p>
                  </div>

                  {/* SoH bar */}
                  <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-lg font-bold ${SOH_COLOR(sohPct)}`}>{sohPct}% SoH</span>
                    <div className="w-24 bg-white/10 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${SOH_BG(sohPct)}`}
                        style={{ width: `${sohPct}%` }} />
                    </div>
                  </div>

                  {/* Check progress */}
                  <div className="text-xs text-white/40 shrink-0 text-right">
                    <span className={allDone ? 'text-[#C8F000] font-bold' : ''}>
                      {checkedCount}/{CHECKS.length}
                    </span>
                    <p>checks</p>
                  </div>

                  {isExpanded ? <ChevronUp size={16} className="text-white/30 shrink-0" /> : <ChevronDown size={16} className="text-white/30 shrink-0" />}
                </button>

                {/* Expanded checklist */}
                {isExpanded && (
                  <div className="border-t border-white/10 px-5 py-4 space-y-4">

                    {/* AI info if available */}
                    {b.ai_severity && (
                      <div className={`rounded-xl px-4 py-3 text-sm border ${
                        b.ai_severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                        b.ai_severity === 'WARNING'  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' :
                        'bg-white/5 border-white/10 text-white/60'}`}>
                        <p className="font-semibold text-xs uppercase tracking-wider mb-1">
                          AI Diagnosis — {b.ai_severity}
                        </p>
                        <p className="text-xs">{b.ai_recommendation ?? 'No recommendation available.'}</p>
                      </div>
                    )}

                    {/* Checklist items */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CHECKS.map(({ id, icon: Icon, label, desc }) => {
                        const ticked = checks[b.battery_id]?.[id] ?? false;
                        return (
                          <button key={id}
                            onClick={() => !isDone && toggleCheck(b.battery_id, id)}
                            disabled={isDone}
                            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
                              ticked
                                ? 'bg-[#C8F000]/10 border-[#C8F000]/30'
                                : 'bg-white/3 border-white/8 hover:bg-white/8'
                            } ${isDone ? 'cursor-default' : 'cursor-pointer'}`}>
                            <div className={`mt-0.5 shrink-0 ${ticked ? 'text-[#C8F000]' : 'text-white/30'}`}>
                              {ticked
                                ? <CheckSquare size={17} />
                                : <Square size={17} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Icon size={13} className={ticked ? 'text-[#C8F000]' : 'text-white/40'} />
                                <p className={`text-xs font-semibold ${ticked ? 'text-[#C8F000]' : 'text-white/80'}`}>
                                  {label}
                                </p>
                              </div>
                              <p className="text-white/35 text-xs mt-0.5 leading-relaxed">{desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Notes */}
                    {!isDone && (
                      <div>
                        <label className="text-white/40 text-xs font-medium mb-1 block">
                          Technician Notes (optional)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Add any observations, measurements, or findings…"
                          value={notes[b.battery_id] ?? ''}
                          onChange={e => setNotes(p => ({ ...p, [b.battery_id]: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs placeholder-white/20 focus:outline-none focus:border-[#C8F000] resize-none transition-all"
                        />
                      </div>
                    )}

                    {/* Completion footer */}
                    {isDone ? (
                      <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                        <CheckCircle size={18} className="text-green-400 shrink-0" />
                        <div>
                          <p className="text-green-400 text-sm font-semibold">Inspection Complete</p>
                          <p className="text-white/40 text-xs">
                            Signed off by <strong className="text-white/60">{completed[b.battery_id].tech}</strong> at {completed[b.battery_id].timestamp}
                          </p>
                          {notes[b.battery_id] && (
                            <p className="text-white/40 text-xs mt-1">Notes: {notes[b.battery_id]}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-white/30 text-xs">
                          {allDone
                            ? 'All checks passed — ready to mark complete.'
                            : `${CHECKS.length - checkedCount} check${CHECKS.length - checkedCount !== 1 ? 's' : ''} remaining`}
                        </p>
                        <button
                          onClick={() => handleComplete(b)}
                          disabled={!allDone || saving[b.battery_id]}
                          className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2">
                          {saving[b.battery_id]
                            ? <span className="w-4 h-4 border-2 border-[#0d1230]/30 border-t-[#0d1230] rounded-full animate-spin" />
                            : <CheckCircle size={15} />}
                          Mark Inspected
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
