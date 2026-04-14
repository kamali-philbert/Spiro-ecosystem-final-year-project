import { useEffect, useState } from 'react';
import API from '../../services/api';
import { ClipboardList, CheckCircle, Clock } from 'lucide-react';

const ticketBadge = (s) => {
  if (s === 'RESOLVED') return 'badge-green';
  if (s === 'OPEN') return 'badge-red';
  if (s === 'IN_PROGRESS') return 'badge-yellow';
  return 'badge-gray';
};

export default function RepairTickets() {
  const [tickets,  setTickets]  = useState([]);
  const [stations, setStations] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error,    setError]    = useState('');
  const [resolveId,   setResolveId]   = useState(null);
  const [stationPick, setStationPick] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      API.get('/tickets'),
      API.get('/stations'),
    ]).then(([tRes, sRes]) => {
      setTickets(tRes.data.data ?? []);
      setStations(sRes.data.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status, stationId) => {
    setUpdating(id);
    setError('');
    try {
      await API.put(`/tickets/${id}`, { status, station_id: stationId });
      setResolveId(null); setStationPick('');
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update ticket.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Repair Tickets</h1>
        <p className="text-white/50 text-sm">Manage battery repair and maintenance tickets.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass p-8 text-center text-white/40">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
          <p>No repair tickets found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t.ticket_id} className="glass p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">Ticket #{t.ticket_id}</span>
                    <span className={ticketBadge(t.status)}>{t.status}</span>
                  </div>
                  <p className="text-white/60 text-sm">{t.issue_description}</p>
                  <p className="text-white/30 text-xs mt-1">Battery ID: {t.battery_id} | SoH at report: {t.soh_before}%</p>
                </div>
              </div>
              {t.status !== 'RESOLVED' && (
                <div className="flex gap-2 pt-2 border-t border-white/10 flex-wrap">
                  {t.status === 'OPEN' && (
                    <button onClick={() => updateStatus(t.ticket_id, 'IN_PROGRESS')}
                      disabled={updating === t.ticket_id}
                      className="btn-secondary text-xs py-1.5 px-4 flex items-center gap-1.5 disabled:opacity-50">
                      <Clock size={12} /> Start Work
                    </button>
                  )}
                  {resolveId === t.ticket_id ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={stationPick}
                        onChange={e => setStationPick(e.target.value)}
                        className="bg-gray-900 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5">
                        <option value="">Select station to return battery...</option>
                        {stations.map(s => (
                          <option key={s.station_id} value={s.station_id}>{s.station_name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => updateStatus(t.ticket_id, 'RESOLVED', stationPick || null)}
                        disabled={updating === t.ticket_id}
                        className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 disabled:opacity-50">
                        <CheckCircle size={12} /> {updating === t.ticket_id ? 'Saving...' : 'Confirm'}
                      </button>
                      <button onClick={() => { setResolveId(null); setStationPick(''); }}
                        className="text-white/30 hover:text-white text-xs px-2">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setResolveId(t.ticket_id)}
                      className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5">
                      <CheckCircle size={12} /> Mark Resolved
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
