import { useEffect, useState } from 'react';
import API from '../../services/api';
import { Battery, Filter } from 'lucide-react';

const STATUS_FILTERS = ['ALL', 'AVAILABLE', 'CHARGING', 'FLAGGED', 'END_OF_LIFE'];

const statusBadge = (s) => {
  if (s === 'AVAILABLE')  return 'badge-green';
  if (s === 'FLAGGED' || s === 'END_OF_LIFE') return 'badge-red';
  if (s === 'CHARGING')   return 'badge-blue';
  return 'badge-yellow';
};

const sohColor = (v) =>
  v < 20 ? 'text-red-400' : v < 50 ? 'text-yellow-400' : 'text-spiro-400';

const PAGE_SIZE = 15;

export default function BatteryHealth() {
  const [batteries, setBatteries] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('ALL');
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    API.get('/batteries')
      .then(r => setBatteries(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter + search
  const filtered = batteries.filter(b => {
    const matchStatus = filter === 'ALL' || b.status === filter;
    const matchSearch = !search ||
      b.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      b.model?.toLowerCase().includes(search.toLowerCase()) ||
      String(b.battery_id).includes(search);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (f) => { setFilter(f); setPage(1); };
  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Battery Health</h1>
        <p className="text-white/50 text-sm mt-1">Full fleet battery health report — {batteries.length} batteries total.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by serial, model, or ID…"
          value={search}
          onChange={handleSearch}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-spiro-500"
        />
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-spiro-600 text-white'
                  : 'glass text-white/50 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="glass overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  {['ID', 'Serial Number', 'Model', 'SoH %', 'SoC %', 'Cycles', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(b => (
                  <tr key={b.battery_id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${b.status === 'FLAGGED' || b.status === 'END_OF_LIFE' ? 'bg-red-500/5' : ''}`}>
                    <td className="px-5 py-3 text-white/50">{b.battery_id}</td>
                    <td className="px-5 py-3 text-white font-mono text-xs">{b.serial_number}</td>
                    <td className="px-5 py-3 text-white/70">{b.model}</td>
                    <td className="px-5 py-3">
                      <span className={`font-bold ${sohColor(b.state_of_health)}`}>{b.state_of_health}%</span>
                    </td>
                    <td className="px-5 py-3 text-white/70">{b.state_of_charge}%</td>
                    <td className="px-5 py-3 text-white/50">{b.cycle_count ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={statusBadge(b.status)}>{b.status}</span>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-white/30 py-10 px-5">
                      No batteries match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-white/50">
              <p>{filtered.length} results</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 glass rounded-lg disabled:opacity-30 hover:text-white transition-colors"
                >← Prev</button>
                <span className="px-3 py-1 text-white">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 glass rounded-lg disabled:opacity-30 hover:text-white transition-colors"
                >Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
