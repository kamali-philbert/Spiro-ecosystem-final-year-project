import { useEffect, useState } from 'react';
import API from '../../services/api';
import { MapPin, Plus, Trash2, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Battery } from 'lucide-react';

const EMPTY = { station_name: '', location_lat: '', location_lng: '', total_capacity: '', available_count: '' };

export default function StationManagement() {
  const [stations,   setStations]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [feedback,   setFeedback]   = useState(null);
  const [expanded,   setExpanded]   = useState(null);
  const [batteries,  setBatteries]  = useState({});
  const [bLoading,   setBLoading]   = useState(null);

  const load = () => {
    API.get('/stations')
      .then(r => setStations(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleStation = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (batteries[id]) return;
    setBLoading(id);
    try {
      const res = await API.get('/batteries');
      const all = res.data.data ?? [];
      const grouped = {};
      all.forEach(b => {
        const sid = b.station_id;
        if (!grouped[sid]) grouped[sid] = [];
        grouped[sid].push(b);
      });
      setBatteries(prev => ({ ...prev, ...grouped }));
    } catch { /* ignore */ }
    finally { setBLoading(null); }
  };

  const [updating, setUpdating] = useState(null);

  const changeStatus = async (batteryId, newStatus, stationId) => {
    setUpdating(batteryId);
    try {
      await API.put(`/batteries/${batteryId}/status`, { status: newStatus, station_id: stationId });
      const res = await API.get('/batteries');
      const all = res.data.data ?? [];
      const grouped = {};
      all.forEach(b => {
        const sid = b.station_id;
        if (!grouped[sid]) grouped[sid] = [];
        grouped[sid].push(b);
      });
      setBatteries(prev => ({ ...prev, ...grouped }));
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFeedback(null);
    try {
      await API.post('/stations', {
        ...form,
        location_lat:    parseFloat(form.location_lat),
        location_lng:    parseFloat(form.location_lng),
        total_capacity:  parseInt(form.total_capacity),
        available_count: parseInt(form.available_count || 0),
      });
      setFeedback({ type: 'success', msg: `Station "${form.station_name}" created.` });
      setForm(EMPTY);
      load();
      setTimeout(() => { setShowModal(false); setFeedback(null); }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message ?? 'Failed to create station.' });
    } finally { setSubmitting(false); }
  };

  const deleteStation = async (id, name) => {
    if (!window.confirm(`Delete station "${name}"?`)) return;
    await API.delete(`/stations/${id}`);
    load();
  };

  const closeModal = () => { setShowModal(false); setForm(EMPTY); setFeedback(null); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Station Management</h1>
          <p className="text-white/50 text-sm">Click any station row to see its battery breakdown.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Station
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {stations.length === 0 && (
            <p className="text-center text-white/30 py-10">No stations yet. Add your first one.</p>
          )}
          {stations.map(s => {
            const stBatteries = batteries[s.station_id] ?? [];
            const isOpen      = expanded === s.station_id;
            const counts = {
              available:   stBatteries.filter(b => b.status === 'AVAILABLE').length,
              in_use:      stBatteries.filter(b => b.status === 'IN_USE').length,
              charging:    stBatteries.filter(b => b.status === 'CHARGING').length,
              flagged:     stBatteries.filter(b => b.status === 'FLAGGED').length,
              end_of_life: stBatteries.filter(b => b.status === 'END_OF_LIFE').length,
            };

            return (
              <div key={s.station_id} className="glass overflow-hidden">
                {/* Station row */}
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/5 transition"
                  onClick={() => toggleStation(s.station_id)}>
                  <MapPin size={15} className="text-[#C8F000] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{s.station_name}</p>
                    <p className="text-white/30 text-xs">{s.location_lat}, {s.location_lng}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs">
                    <span className="text-white/40">Capacity: <span className="text-white font-semibold">{s.total_capacity}</span></span>
                    <span className="text-green-400 font-semibold">{s.available_count} available</span>
                    <span className={s.is_active ? 'badge-green' : 'badge-gray'}>{s.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteStation(s.station_id, s.station_name); }}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition ml-2">
                    <Trash2 size={14} />
                  </button>
                  {isOpen
                    ? <ChevronUp size={16} className="text-white/30 shrink-0" />
                    : <ChevronDown size={16} className="text-white/30 shrink-0" />}
                </div>

                {/* Expanded battery breakdown */}
                {isOpen && (
                  <div className="border-t border-white/10 px-5 py-4 bg-[#0d1230]/60">
                    {bLoading === s.station_id ? (
                      <div className="flex items-center gap-2 text-white/40 text-sm py-2">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                        Loading batteries…
                      </div>
                    ) : (
                      <>
                        {/* Status summary pills */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {[
                            { label: 'Available',   count: counts.available,   cls: 'text-green-400  bg-green-500/10  border border-green-500/20' },
                            { label: 'In Use',      count: counts.in_use,      cls: 'text-blue-400   bg-blue-500/10   border border-blue-500/20' },
                            { label: 'Charging',    count: counts.charging,    cls: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20' },
                            { label: 'Flagged',     count: counts.flagged,     cls: 'text-red-400    bg-red-500/10    border border-red-500/20' },
                            { label: 'End of Life', count: counts.end_of_life, cls: 'text-white/30   bg-white/5       border border-white/10' },
                          ].map(({ label, count, cls }) => (
                            <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${cls}`}>
                              <Battery size={11} /> {count} {label}
                            </div>
                          ))}
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2B3EE6]/30 bg-[#2B3EE6]/10 text-[#C8F000] text-xs font-semibold ml-auto">
                            Total: {stBatteries.length} batteries
                          </div>
                        </div>

                        {/* Battery list */}
                        {stBatteries.length === 0 ? (
                          <p className="text-white/30 text-sm">No batteries assigned to this station.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-white/10">
                                  {['Serial', 'Model', 'SoH', 'SoC', 'Status'].map(h => (
                                    <th key={h} className="text-left px-3 py-2 text-white/30 font-medium">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {stBatteries.map(b => (
                                  <tr key={b.battery_id} className="border-b border-white/5 hover:bg-white/5 transition">
                                    <td className="px-3 py-2 font-mono text-white/70">{b.serial_number}</td>
                                    <td className="px-3 py-2 text-white/50">{b.model}</td>
                                    <td className="px-3 py-2">
                                      <span className={`font-semibold ${Number(b.state_of_health) < 20 ? 'text-red-400' : Number(b.state_of_health) < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {b.state_of_health}%
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-white/60">{b.state_of_charge}%</td>
                                    <td className="px-3 py-2">
                                      <select
                                        value={b.status}
                                        disabled={updating === b.battery_id}
                                        onChange={e => changeStatus(b.battery_id, e.target.value, b.station_id)}
                                        className="bg-[#1a2255] border border-[#2B3EE6]/30 text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#C8F000]/50 disabled:opacity-40">
                                        <option value="AVAILABLE">AVAILABLE</option>
                                        <option value="IN_USE">IN_USE</option>
                                        <option value="CHARGING">CHARGING</option>
                                        <option value="FLAGGED">FLAGGED</option>
                                        <option value="END_OF_LIFE">END_OF_LIFE</option>
                                      </select>
                                      {updating === b.battery_id && (
                                        <span className="ml-1 inline-block w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal — unchanged */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Add New Station</h2>
                <p className="text-white/40 text-xs mt-0.5">Station will be active immediately.</p>
              </div>
              <button onClick={closeModal} className="text-white/30 hover:text-white transition-colors"><X size={20} /></button>
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
                <label className="text-white/50 text-xs font-medium mb-1 block">Station Name</label>
                <input type="text" placeholder="e.g. Kimironko Station" required
                  value={form.station_name} onChange={e => setForm(p => ({ ...p, station_name: e.target.value }))}
                  className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1 block">Latitude</label>
                  <input type="number" step="any" placeholder="-1.9441" required
                    value={form.location_lat} onChange={e => setForm(p => ({ ...p, location_lat: e.target.value }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1 block">Longitude</label>
                  <input type="number" step="any" placeholder="30.1058" required
                    value={form.location_lng} onChange={e => setForm(p => ({ ...p, location_lng: e.target.value }))}
                    className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1 block">Total Capacity</label>
                  <input type="number" min="1" placeholder="10" required
                    value={form.total_capacity} onChange={e => setForm(p => ({ ...p, total_capacity: e.target.value }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1 block">Available Now</label>
                  <input type="number" min="0" placeholder="0"
                    value={form.available_count} onChange={e => setForm(p => ({ ...p, available_count: e.target.value }))}
                    className="input-field" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={15} />}
                  {submitting ? 'Creating…' : 'Add Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
