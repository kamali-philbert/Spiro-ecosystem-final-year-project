import { useEffect, useState } from 'react';
import API from '../../services/api';
import { Battery, Plus, Trash2, X, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const STATUSES = ['AVAILABLE', 'CHARGING', 'IN_USE', 'FLAGGED', 'END_OF_LIFE'];
const EMPTY = { serial_number: '', model: '', state_of_health: '', state_of_charge: '', status: 'AVAILABLE', station_id: '' };

const statusBadge = (s) => {
  if (s === 'AVAILABLE')   return 'badge-green';
  if (s === 'FLAGGED' || s === 'END_OF_LIFE') return 'badge-red';
  if (s === 'CHARGING')    return 'badge-yellow';
  return 'badge-blue';
};

export default function BatteryManagement() {
  const [batteries,  setBatteries]  = useState([]);
  const [stations,   setStations]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [feedback,   setFeedback]   = useState(null);
  const [qrBattery,  setQrBattery]  = useState(null);
  const [modalStations, setModalStations] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = () => {
    Promise.all([API.get('/batteries'), API.get('/stations')])
      .then(([bRes, sRes]) => {
        setBatteries(bRes.data.data ?? []);
        setStations(sRes.data.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Reload stations fresh every time modal opens
  const openModal = () => {
    API.get('/stations')
      .then(r => setModalStations(r.data.data ?? []))
      .catch(() => setModalStations(stations));
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFeedback(null);
    try {
      await API.post('/batteries', {
        ...form,
        state_of_health: parseFloat(form.state_of_health),
        state_of_charge: parseFloat(form.state_of_charge),
        station_id: form.station_id ? parseInt(form.station_id) : null,
      });
      setFeedback({ type: 'success', msg: `Battery "${form.serial_number}" added.` });
      setForm(EMPTY);
      load();
      setTimeout(() => { setShowModal(false); setFeedback(null); }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message ?? 'Failed to create battery.' });
    } finally { setSubmitting(false); }
  };

  const deleteBattery = async (id) => {
    if (!window.confirm('Delete this battery permanently?')) return;
    await API.delete(`/batteries/${id}`);
    load();
  };

  const closeModal = () => { setShowModal(false); setForm(EMPTY); setFeedback(null); };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Battery Management</h1>
          <p className="text-white/50 text-sm">Add and manage all batteries in the fleet.</p>
        </div>
        <button onClick={openModal} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Battery
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
                {['ID', 'Serial Number', 'Model', 'SoH %', 'SoC %', 'Status', 'Station', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batteries.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(b => {
                const station = stations.find(s => s.station_id === b.station_id);
                return (
                  <tr key={b.battery_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-white/50">{b.battery_id}</td>
                    <td className="px-5 py-3 text-white font-mono text-xs">{b.serial_number}</td>
                    <td className="px-5 py-3 text-white/70">{b.model}</td>
                    <td className="px-5 py-3">
                      <span className={`font-bold ${b.state_of_health < 20 ? 'text-red-400' : b.state_of_health < 50 ? 'text-yellow-400' : 'text-spiro-400'}`}>
                        {b.state_of_health}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/70">{b.state_of_charge}%</td>
                    <td className="px-5 py-3"><span className={statusBadge(b.status)}>{b.status}</span></td>
                    <td className="px-5 py-3 text-white/50 text-xs">{station?.station_name ?? '—'}</td>
                    <td className="px-5 py-3 flex items-center gap-2">
                      <select
                        defaultValue={b.status}
                        onChange={async (e) => {
                          await API.put(`/batteries/${b.battery_id}/status`, { status: e.target.value });
                          load();
                        }}
                        className="bg-gray-900 border border-white/10 text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-spiro-500">
                        {STATUSES.map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                      </select>
                      <button onClick={() => setQrBattery(b)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-spiro-400 transition-colors"
                        title="Show QR Code">
                        <QrCode size={15} />
                      </button>
                      <button onClick={() => deleteBattery(b.battery_id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {batteries.length === 0 && (
            <p className="text-center text-white/30 py-10">No batteries yet. Add your first one.</p>
          )}
          {batteries.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
              <p className="text-white/40 text-xs">
                Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, batteries.length)} of {batteries.length}
              </p>
              <div className="flex gap-2">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                  className="px-3 py-1 text-xs rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                  Prev
                </button>
                <button disabled={page*PAGE_SIZE>=batteries.length} onClick={() => setPage(p=>p+1)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass w-full max-w-md p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Add New Battery</h2>
                <p className="text-white/40 text-xs mt-0.5">Battery will be added to the fleet immediately.</p>
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
                <label className="text-white/50 text-xs font-medium mb-1 block">Serial Number</label>
                <input type="text" placeholder="e.g. SPR-BAT-001" required
                  value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Model</label>
                <input type="text" placeholder="e.g. Spiro 72V 40Ah" required
                  value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                  className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1 block">SoH %</label>
                  <input type="number" min="0" max="100" step="0.01" placeholder="95.00" required
                    value={form.state_of_health} onChange={e => setForm(p => ({ ...p, state_of_health: e.target.value }))}
                    className="input-field" />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1 block">SoC %</label>
                  <input type="number" min="0" max="100" step="0.01" placeholder="100.00" required
                    value={form.state_of_charge} onChange={e => setForm(p => ({ ...p, state_of_charge: e.target.value }))}
                    className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="input-field bg-gray-900 text-white">
                  {STATUSES.map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Assign to Station (optional)</label>
                <select value={form.station_id} onChange={e => setForm(p => ({ ...p, station_id: e.target.value }))}
                  className="input-field bg-gray-900 text-white">
                  <option value="" className="bg-gray-900">-- No Station --</option>
                  {modalStations.map(s => (
                    <option key={s.station_id} value={s.station_id} className="bg-gray-900">
                      {s.station_name}
                    </option>
                  ))}
                </select>
                {modalStations.length === 0 && (
                  <p className="text-yellow-400 text-xs mt-1">No stations found. Add a station first.</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={15} />}
                  {submitting ? 'Adding…' : 'Add Battery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* QR Code Modal */}
      {qrBattery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass w-full max-w-xs p-6 space-y-5 text-center">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold">Battery QR Code</h2>
              <button onClick={() => setQrBattery(null)} className="text-white/30 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex justify-center bg-white p-4 rounded-xl">
              <QRCodeSVG value={qrBattery.serial_number} size={180} />
            </div>
            <div className="space-y-1">
              <p className="text-white font-mono text-sm">{qrBattery.serial_number}</p>
              <p className="text-white/40 text-xs">{qrBattery.model}</p>
              <p className="text-white/30 text-xs">Battery ID: {qrBattery.battery_id}</p>
            </div>
            <p className="text-white/30 text-xs">Print this and attach it to the physical battery.</p>
            <button onClick={() => window.print()} className="btn-secondary w-full text-sm">
              🖨️ Print QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
