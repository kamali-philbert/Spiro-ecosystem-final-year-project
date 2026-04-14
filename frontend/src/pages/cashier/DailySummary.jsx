import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function DailySummary() {
  const [summary, setSummary] = useState({ swaps: [], payments: [], total_cash: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const { data } = await api.get('/cashier/daily-summary');
      if (data.status === 'success') {
        setSummary(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-[#aeb2d5]">Loading summary...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Daily Summary</h1>
        <p className="text-[#aeb2d5] text-sm mt-1">Transactions processed today.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Completed Swaps</h2>
        {summary.swaps.length === 0 ? (
          <p className="text-[#aeb2d5] text-sm">No swaps completed today.</p>
        ) : (
          <div className="bg-[#1a2255] border border-[#2B3EE6]/30 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-[#aeb2d5]">
              <thead className="bg-[#0d1230] text-xs uppercase text-white border-b border-[#2B3EE6]/30">
                <tr>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Rider</th>
                  <th className="px-6 py-4">Station</th>
                  <th className="px-6 py-4">Cost (RWF)</th>
                </tr>
              </thead>
              <tbody>
                {summary.swaps.map(s => (
                  <tr key={s.transaction_id} className="border-b border-[#2B3EE6]/10 hover:bg-[#2B3EE6]/5">
                    <td className="px-6 py-4">{new Date(s.swap_timestamp).toLocaleTimeString()}</td>
                    <td className="px-6 py-4 text-white">{s.rider_name}</td>
                    <td className="px-6 py-4">{s.station_name}</td>
                    <td className="px-6 py-4 font-bold text-green-400">{s.cost || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Cash Collections</h2>
        {summary.payments.length === 0 ? (
          <p className="text-[#aeb2d5] text-sm">No cash collected today.</p>
        ) : (
          <div className="bg-[#1a2255] border border-[#2B3EE6]/30 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-[#aeb2d5]">
              <thead className="bg-[#0d1230] text-xs uppercase text-white border-b border-[#2B3EE6]/30">
                <tr>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Rider</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Amount (RWF)</th>
                </tr>
              </thead>
              <tbody>
                {summary.payments.map(p => (
                  <tr key={p.payment_id} className="border-b border-[#2B3EE6]/10 hover:bg-[#2B3EE6]/5">
                    <td className="px-6 py-4">{new Date(p.created_at).toLocaleTimeString()}</td>
                    <td className="px-6 py-4 text-white">{p.rider_name}</td>
                    <td className="px-6 py-4">{p.payment_method}</td>
                    <td className="px-6 py-4 font-bold text-green-400">{Number(p.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
