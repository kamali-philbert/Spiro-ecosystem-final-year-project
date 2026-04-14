import { useEffect, useState } from 'react';
import API from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, Repeat, Battery, CreditCard, DollarSign } from 'lucide-react';

const PIE_COLORS = {
  AVAILABLE:   '#22d3ee',
  CHARGING:    '#facc15',
  FLAGGED:     '#f87171',
  END_OF_LIFE: '#b91c1c',
  IN_USE:      '#818cf8',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white shadow-xl">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

function groupSwapsByDay(swaps) {
  const counts = {};
  swaps.forEach(s => {
    const day = s.swap_timestamp ? s.swap_timestamp.slice(0, 10) : 'unknown';
    counts[day] = (counts[day] ?? 0) + 1;
  });
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, swaps]) => ({ date: date.slice(5), swaps }));
}

const PAGE_SIZE = 10;

export default function Analytics() {
  const [swaps,       setSwaps]       = useState([]);
  const [swapData,    setSwapData]    = useState([]);
  const [statusData,  setStatusData]  = useState([]);
  const [totalSwaps,  setTotalSwaps]  = useState(0);
  const [totalBatts,  setTotalBatts]  = useState(0);
  const [totalRev,    setTotalRev]    = useState(0);
  const [dailyCash,   setDailyCash]   = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [filter,      setFilter]      = useState('ALL');

  useEffect(() => {
    const load = async () => {
      try {
        const [swapsRes, battRes, auditsRes] = await Promise.all([
          API.get('/swaps'),
          API.get('/batteries'),
          API.get('/admin/cashier-audits'),
        ]);
        const swapList  = swapsRes.data.data ?? [];
        const batteries = battRes.data.data ?? [];
        const audits    = auditsRes.data.data ?? [];

        setSwaps(swapList);
        setTotalSwaps(swapList.length);
        setTotalBatts(batteries.length);
        setTotalRev(swapList.reduce((sum, s) => sum + parseFloat(s.cost ?? 0), 0));
        setDailyCash(audits.reduce((sum, a) => sum + Number(a.total_collected ?? 0), 0));
        setSwapData(groupSwapsByDay(swapList));

        const dist = batteries.reduce((acc, b) => {
          acc[b.status] = (acc[b.status] ?? 0) + 1;
          return acc;
        }, {});
        setStatusData(Object.entries(dist).map(([name, value]) => ({ name, value })));
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = filter === 'ALL' ? swaps : swaps.filter(s => s.status === filter);
  const paged    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-white/50 text-sm mt-1">Swap activity, revenue, and fleet battery distribution.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Swaps',      value: totalSwaps, icon: Repeat,      color: 'text-[#C8F000]' },
          { label: 'Total Batteries',  value: totalBatts, icon: Battery,     color: 'text-yellow-400' },
          { label: 'Avg Swaps / Day',  value: swapData.length ? (totalSwaps / swapData.length).toFixed(1) : '—',
            icon: TrendingUp, color: 'text-purple-400' },
          { label: 'Daily Cash Collected', value: `${dailyCash.toLocaleString()} RWF`, icon: CreditCard, color: 'text-green-400' },
          { label: 'All-Time Swap Revenue',value: `${totalRev.toLocaleString()} RWF`, icon: DollarSign, color: 'text-[#aeb2d5]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <Icon size={22} className={color} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-white/50 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center h-60 items-center">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="glass p-6 xl:col-span-3">
              <h2 className="text-lg font-semibold text-white mb-5">Swaps Per Day (Last 14 Days)</h2>
              {swapData.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-16">No swap data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={swapData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="swaps" fill="#C8F000" radius={[4, 4, 0, 0]} name="Swaps" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass p-6 xl:col-span-2">
              <h2 className="text-lg font-semibold text-white mb-5">Battery Status Distribution</h2>
              {statusData.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-16">No battery data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="45%"
                      innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {statusData.map(entry => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? '#6b7280'} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8}
                      formatter={v => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v}</span>} />
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Swap Transaction Logs */}
          <div className="glass overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Repeat size={16} className="text-[#C8F000]" />
                <h2 className="text-base font-semibold text-white">Swap Transaction Logs</h2>
                <span className="badge-yellow ml-1">{filtered.length} records</span>
              </div>
              <div className="flex gap-2">
                {['ALL', 'COMPLETED', 'PENDING', 'FAILED'].map(f => (
                  <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                    className={`text-xs px-3 py-1 rounded-lg border transition ${
                      filter === f
                        ? 'bg-[#C8F000]/15 text-[#C8F000] border-[#C8F000]/30'
                        : 'border-white/10 text-white/40 hover:text-white'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  {['#', 'Date & Time', 'Rider', 'Station', 'Battery Given', 'Battery Received', 'SoC Returned', 'Cost (RWF)', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((s, i) => (
                  <tr key={s.transaction_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white/40 text-xs">{(page-1)*PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">
                      {new Date(s.swap_timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-white text-xs">{s.rider_name ?? `#${s.rider_id}`}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{s.station_name ?? '—'}</td>
                    <td className="px-4 py-3 text-white/60 font-mono text-xs">{s.battery_given_id}</td>
                    <td className="px-4 py-3 text-white/60 font-mono text-xs">{s.battery_received_id}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{s.soc_at_return ?? '—'}%</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-[#C8F000] text-xs">
                        {parseFloat(s.cost ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={
                        s.status === 'COMPLETED' ? 'badge-green' :
                        s.status === 'FAILED'    ? 'badge-red'   : 'badge-yellow'
                      }>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <p className="text-center text-white/30 py-10">No transactions found.</p>
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
        </>
      )}
    </div>
  );
}
