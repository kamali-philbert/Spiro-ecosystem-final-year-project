import { useEffect, useState } from 'react';
import API from '../../services/api';
import { MapPin, Plus, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';

const EMPTY = { station_name: '', location_lat: '', location_lng: '', total_capacity: '', available_count: '' };

export default function StationManagement() {
  const [stations,   setStations]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [feedback,   setFeedback]   = useState(null);

  const load = () => {
    API.get('/stations')
      .then(r => setStations(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

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
          <p className="text-white/50 text-sm">Manage all Spiro swapping stations.</p>
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
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr>
                {['ID', 'Station Name', 'Latitude', 'Longitude', 'Capacity', 'Available', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stations.map(s => (
                <tr key={s.station_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 text-white/50">{s.station_id}</td>
                  <td className="px-5 py-3 text-white font-medium flex items-center gap-2">
                    <MapPin size={13} className="text-spiro-400" />{s.station_name}
                  </td>
                  <td className="px-5 py-3 text-white/60">{s.location_lat}</td>
                  <td className="px-5 py-3 text-white/60">{s.location_lng}</td>
                  <td className="px-5 py-3 text-white/70">{s.total_capacity}</td>
                  <td className="px-5 py-3">
                    <span className={s.available_count < 2 ? 'text-yellow-400 font-bold' : 'text-spiro-400 font-bold'}>
                      {s.available_count}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={s.is_active ? 'badge-green' : 'badge-gray'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => deleteStation(s.station_id, s.station_name)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stations.length === 0 && (
            <p className="text-center text-white/30 py-10">No stations yet. Add your first one.</p>
          )}
        </div>
      )}

      {/* Modal */}
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
