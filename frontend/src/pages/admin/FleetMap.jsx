import { useEffect, useState } from 'react';
import API from '../../services/api';
import { Zap, Battery, CheckCircle, AlertTriangle, MapPin } from 'lucide-react';

const statusDot = (s) => {
  if (s === 'AVAILABLE')  return 'bg-spiro-400';
  if (s === 'FLAGGED')    return 'bg-red-400';
  if (s === 'CHARGING')   return 'bg-yellow-400';
  if (s === 'END_OF_LIFE') return 'bg-red-700';
  return 'bg-white/30';
};

export default function FleetMap() {
  const [stations,  setStations]  = useState([]);
  const [batteries, setBatteries] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('ALL'); // ALL | ACTIVE | INACTIVE

  useEffect(() => {
    const load = async () => {
      try {
        const [stRes, batRes] = await Promise.all([
          API.get('/stations'),
          API.get('/batteries'),
        ]);
        setStations(stRes.data.data ?? []);
        setBatteries(batRes.data.data ?? []);
      } catch { /* handle gracefully */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Group batteries by station_id
  const battsByStation = batteries.reduce((acc, b) => {
    const sid = b.station_id ?? 'unassigned';
    if (!acc[sid]) acc[sid] = [];
    acc[sid].push(b);
    return acc;
  }, {});

  const filteredStations = stations.filter(s => {
    if (filter === 'ACTIVE')   return s.status === 'ACTIVE';
    if (filter === 'INACTIVE') return s.status !== 'ACTIVE';
    return true;
  });

  const summary = {
    total:    stations.length,
    active:   stations.filter(s => s.status === 'ACTIVE').length,
    batteries: batteries.length,
    flagged:  batteries.filter(b => b.status === 'FLAGGED').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Fleet Map</h1>
        <p className="text-white/50 text-sm mt-1">Live overview of all stations and their batteries.</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Stations',   value: summary.total,     icon: MapPin,       color: 'text-blue-400' },
          { label: 'Active Stations',  value: summary.active,    icon: CheckCircle,  color: 'text-spiro-400' },
          { label: 'Total Batteries',  value: summary.batteries, icon: Battery,      color: 'text-yellow-400' },
          { label: 'Flagged',          value: summary.flagged,   icon: AlertTriangle,color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <Icon size={20} className={color} />
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-white/50 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['ALL', 'ACTIVE', 'INACTIVE'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === f
                ? 'bg-spiro-600 text-white'
                : 'glass text-white/50 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStations.map(s => {
            const batts = battsByStation[s.station_id] ?? [];
            const flaggedCount = batts.filter(b => b.status === 'FLAGGED').length;
            return (
              <div key={s.station_id} className="glass p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-semibold">{s.name}</p>
                    <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1">
                      <MapPin size={11} /> {s.location}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.status === 'ACTIVE' ? 'bg-spiro-500/20 text-spiro-400' : 'bg-white/10 text-white/40'
                  }`}>
                    {s.status}
                  </span>
                </div>

                {/* Battery dots */}
                {batts.length > 0 ? (
                  <div>
                    <p className="text-white/40 text-xs mb-2">
                      {batts.length} batter{batts.length === 1 ? 'y' : 'ies'}
                      {flaggedCount > 0 && (
                        <span className="ml-1 text-red-400">· {flaggedCount} flagged</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {batts.map(b => (
                        <div
                          key={b.battery_id}
                          title={`Battery ${b.battery_id} – ${b.status} – SoH ${b.state_of_health}%`}
                          className={`w-3 h-3 rounded-full ${statusDot(b.status)}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-white/20 text-xs">No batteries assigned</p>
                )}

                {/* Capacity */}
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Zap size={12} className="text-yellow-400" />
                  Capacity: {s.capacity ?? '—'} slots &nbsp;·&nbsp;
                  Available: {batts.filter(b => b.status === 'AVAILABLE').length}
                </div>
              </div>
            );
          })}
          {filteredStations.length === 0 && (
            <p className="text-white/30 col-span-3 text-center py-10">No stations match the selected filter.</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="glass p-4 flex flex-wrap gap-4 text-xs text-white/50">
        {[
          { label: 'Available',   cls: 'bg-spiro-400' },
          { label: 'Charging',    cls: 'bg-yellow-400' },
          { label: 'Flagged',     cls: 'bg-red-400' },
          { label: 'End of Life', cls: 'bg-red-700' },
          { label: 'Other',       cls: 'bg-white/30' },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cls}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
