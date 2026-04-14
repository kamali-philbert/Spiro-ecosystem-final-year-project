import { useEffect, useState } from 'react';
import API from '../../services/api';
import { Wrench, Battery, AlertTriangle, CheckCircle, Search } from 'lucide-react';

const statusBadge = (s) => {
  if (s === 'AVAILABLE') return 'badge-green';
  if (s === 'FLAGGED' || s === 'END_OF_LIFE') return 'badge-red';
  if (s === 'CHARGING') return 'badge-blue';
  return 'badge-yellow';
};

const severityColor = (sev) => {
  if (sev === 'CRITICAL') return 'text-red-400';
  if (sev === 'WARNING')  return 'text-yellow-400';
  if (sev === 'MODERATE') return 'text-orange-400';
  return 'text-spiro-400';
};

const PAGE_SIZE = 10;

export default function DiagnosticPortal() {
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    API.get('/batteries')
      .then(r => setBatteries(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = batteries.filter(b => {
    const matchFilter = filter === 'ALL' || b.status === filter || (filter === 'NEEDS_ATTENTION' && (b.status === 'FLAGGED' || b.state_of_health < 30));
    const matchSearch = !search || b.serial_number.toLowerCase().includes(search.toLowerCase()) || b.model.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    total: batteries.length,
    flagged: batteries.filter(b => b.status === 'FLAGGED').length,
    critical: batteries.filter(b => b.state_of_health < 20).length,
    available: batteries.filter(b => b.status === 'AVAILABLE').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Diagnostic Portal</h1>
        <p className="text-white/50 text-sm">Monitor fleet batteries. Flagged or low-SoH batteries need attention.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Batteries', value: counts.total, color: 'text-white' },
          { label: 'Available', value: counts.available, color: 'text-spiro-400' },
          { label: 'Flagged', value: counts.flagged, color: 'text-red-400' },
          { label: 'Critical SoH (<20%)', value: counts.critical, color: 'text-yellow-400' },
        ].map(c => (
          <div key={c.label} className="glass px-4 py-3">
            <p className="text-white/40 text-xs">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text" placeholder="Search serial or model…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-8 text-xs py-2"
          />
        </div>
        {['ALL', 'NEEDS_ATTENTION', 'AVAILABLE', 'CHARGING', 'IN_USE', 'FLAGGED'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              filter === f
                ? 'bg-[#C8F000]/15 text-[#C8F000] border-[#C8F000]/30'
                : 'border-white/10 text-white/40 hover:text-white hover:border-white/20'
            }`}>
            {f === 'NEEDS_ATTENTION' ? '⚠ Needs Attention' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr>
                {['ID', 'Serial', 'Model', 'SoH %', 'SoC %', 'Status', 'AI Severity', 'AI Recommendation'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(b => (
                <tr key={b.battery_id}
                  className={`border-b border-white/5 hover:bg-white/5 transition-colors ${b.status === 'FLAGGED' || b.state_of_health < 20 ? 'bg-red-500/5' : ''}`}>
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
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold ${severityColor(b.ai_severity)}`}>
                      {b.ai_severity ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white/50 text-xs max-w-xs truncate" title={b.ai_recommendation}>
                    {b.ai_recommendation ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-white/30 py-10">No batteries match the current filter.</p>
          )}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
              <p className="text-white/40 text-xs">
                Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                  className="px-3 py-1 text-xs rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                  Prev
                </button>
                <button disabled={page*PAGE_SIZE>=filtered.length} onClick={() => setPage(p=>p+1)}
                  className="px-3 py-1 text-xs rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
