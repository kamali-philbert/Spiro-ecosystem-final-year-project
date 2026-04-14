import { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, Calendar, TrendingUp, Battery, DollarSign } from 'lucide-react';
import API from '../../services/api';
import { generateDailyReportPDF } from '../../services/reportService';

export default function CashierDashboard() {
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchReport = async () => {
    setLoading(true); setError('');
    try {
      const res = await API.get(`/cashier/daily-report?date=${date}`);
      setReport(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [date]);

  const fmt    = (n)  => Number(n).toLocaleString('en-RW') + ' RWF';
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' });

  // Group transactions by rider
  const grouped = report ? Object.values(
    report.transactions.reduce((acc, t) => {
      const key = t.rider_name;
      if (!acc[key]) acc[key] = { rider_name: t.rider_name, rider_phone: t.rider_phone, swaps: [], total: 0 };
      acc[key].swaps.push(t);
      acc[key].total += Number(t.cost);
      return acc;
    }, {})
  ) : [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Report</h1>
          <p className="text-white/40 text-sm mt-1">Each rider's battery swaps and charges for the day</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="input-field pl-9 text-sm py-2" />
          </div>
          <button onClick={fetchReport} disabled={loading}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => report && generateDailyReportPDF(report, { role: 'CASHIER' })}
            disabled={!report || loading}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm disabled:opacity-40">
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Battery,    label: 'Total Swaps',       value: report.total_swaps,        color: '#2B3EE6' },
              { icon: DollarSign, label: 'Total Revenue',     value: fmt(report.total_revenue),  color: '#3DB54A' },
              { icon: TrendingUp, label: 'Avg SoC Returned',  value: `${report.avg_soc}%`,       color: '#C8F000' },
              { icon: FileText,   label: 'Unique Riders',     value: grouped.length,             color: '#a78bfa' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span className="text-white/50 text-xs">{label}</span>
                </div>
                <p className="text-white font-bold text-lg">{value}</p>
              </div>
            ))}
          </div>

          {/* Per-rider grouped table */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
              <FileText size={16} className="text-[#C8F000]" />
              <span className="text-white font-semibold text-sm">Swap Records by Rider</span>
              <span className="ml-auto text-white/30 text-xs">{report.transactions.length} transactions · {grouped.length} riders</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {['#', 'Time', 'Rider', 'Phone', 'Battery Given', 'Battery Received', 'SoC Returned', 'Cost'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grouped.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-white/30 text-sm">No swaps recorded for this date</td></tr>
                  ) : grouped.map((rider, ri) => (
                    <>
                      {/* Each swap row for this rider */}
                      {rider.swaps.map((t, si) => (
                        <tr key={t.transaction_id} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="px-4 py-3 text-white/30 text-xs">{si === 0 ? ri + 1 : ''}</td>
                          <td className="px-4 py-3 text-white/70 whitespace-nowrap text-xs">{fmtTime(t.swap_timestamp)}</td>
                          {/* Rider name only on first row */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {si === 0
                              ? <span className="text-white font-semibold">{t.rider_name}</span>
                              : <span className="text-white/30 text-xs pl-2">↳</span>}
                          </td>
                          <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{si === 0 ? (t.rider_phone || '—') : ''}</td>
                          <td className="px-4 py-3 font-mono text-white/60 text-xs whitespace-nowrap">{t.battery_given}</td>
                          <td className="px-4 py-3 font-mono text-white/60 text-xs whitespace-nowrap">{t.battery_received}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${Number(t.soc_at_return) < 20 ? 'text-red-400' : Number(t.soc_at_return) < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {t.soc_at_return}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/80 font-medium whitespace-nowrap text-xs">{fmt(t.cost)}</td>
                        </tr>
                      ))}

                      {/* Rider subtotal row (only if more than 1 swap) */}
                      {rider.swaps.length > 1 && (
                        <tr key={`sub-${ri}`} className="border-b border-[#2B3EE6]/20">
                          <td colSpan={6} />
                          <td className="px-4 py-2 text-white/40 text-xs text-right">Subtotal ({rider.swaps.length} swaps):</td>
                          <td className="px-4 py-2 text-[#C8F000] font-bold text-xs whitespace-nowrap">{fmt(rider.total)}</td>
                        </tr>
                      )}

                      {/* Spacer between riders */}
                      {ri < grouped.length - 1 && (
                        <tr key={`spacer-${ri}`}><td colSpan={8} className="h-1 bg-[#2B3EE6]/10" /></tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Grand total */}
            {report.transactions.length > 0 && (
              <div className="px-5 py-4 border-t border-[#2B3EE6]/30 bg-[#2B3EE6]/10 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <span>{report.total_swaps} total swaps</span>
                  <span>·</span>
                  <span>{grouped.length} riders</span>
                  <span>·</span>
                  <span>Avg SoC returned: {report.avg_soc}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/50 text-sm">Grand Total:</span>
                  <span className="text-[#C8F000] font-black text-lg">{fmt(report.total_revenue)}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {loading && !report && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#2B3EE6]/30 border-t-[#2B3EE6] rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
