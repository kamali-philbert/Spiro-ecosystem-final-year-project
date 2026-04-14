import { useEffect, useState } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Repeat, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 8;

export default function SwapHistory() {
  const { user } = useAuth();
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    API.get(`/swaps/history/${user.user_id}`)
      .then(r => setSwaps(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.user_id]);

  const total = swaps.length;
  const paged = swaps.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Swap History</h1>
        <p className="text-white/50 text-sm">All your battery swap transactions.</p>
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
                {['#', 'Date', 'Station', 'Battery Given', 'Battery Received', 'SoC Given', 'Cost (RWF)'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((s, i) => (
                <tr key={s.transaction_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 text-white/40">{(page-1)*PAGE_SIZE + i + 1}</td>
                  <td className="px-5 py-3 text-white/70 text-xs">
                    {new Date(s.swap_timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-5 py-3 text-white/70">{s.station_name ?? '—'}</td>
                  <td className="px-5 py-3 text-white font-mono text-xs">{s.battery_given_serial ?? s.battery_given_id}</td>
                  <td className="px-5 py-3 text-white font-mono text-xs">{s.battery_received_serial ?? s.battery_received_id}</td>
                  <td className="px-5 py-3 text-white/70">{s.soc_given ?? '—'}%</td>
                  <td className="px-5 py-3">
                    <span className="font-bold text-[#C8F000]">{parseFloat(s.cost ?? 0).toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <Repeat size={32} className="mb-3 opacity-30" />
              <p>No swaps yet. Do your first battery swap!</p>
            </div>
          )}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
              <p className="text-white/40 text-xs">
                Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                  className="p-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={page*PAGE_SIZE>=total} onClick={() => setPage(p=>p+1)}
                  className="p-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
