import { useState, useEffect } from 'react';
import { CreditCard, Download } from 'lucide-react';
import api from '../../services/api';

export default function CashierAudits() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const { data } = await api.get('/admin/cashier-audits');
      if (data.status === 'success') {
        setAudits(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const grandTotal = audits.reduce((sum, a) => sum + Number(a.total_collected), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Cashier Audits</h1>
          <p className="text-[#aeb2d5] text-sm mt-1">Review top-up money collected by your cashiers today.</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => window.print()}>
          <Download size={16} /> Export Report
        </button>
      </div>

      <div className="bg-[#1a2255] border border-[#2B3EE6]/30 p-6 rounded-2xl flex items-center gap-4 w-max">
        <div className="p-3 bg-green-500/20 rounded-lg text-green-400">
          <CreditCard size={24} />
        </div>
        <div>
          <p className="text-[#aeb2d5] text-sm font-medium">Grand Total Enterprise Cash Today</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{grandTotal.toLocaleString()} RWF</p>
        </div>
      </div>

      {loading ? (
        <div className="text-[#aeb2d5]">Loading audits...</div>
      ) : audits.length === 0 ? (
        <div className="text-[#aeb2d5] p-6 bg-[#1a2255] border border-[#2B3EE6]/30 rounded-xl">No cash has been collected by any cashiers today.</div>
      ) : (
        <div className="glass overflow-hidden mt-6">
          <table className="w-full text-left text-sm text-[#aeb2d5]">
            <thead className="bg-[#0d1230] text-xs uppercase text-white border-b border-[#2B3EE6]/30">
              <tr>
                <th className="px-6 py-4">Cashier Name</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Transactions</th>
                <th className="px-6 py-4">Total Cash Collected (RWF)</th>
              </tr>
            </thead>
            <tbody>
              {audits.map(a => (
                <tr key={a.collector_id} className="border-b border-[#2B3EE6]/10 hover:bg-[#2B3EE6]/5">
                  <td className="px-6 py-4 text-white font-medium">{a.cashier_name}</td>
                  <td className="px-6 py-4">{a.phone_number || '--'}</td>
                  <td className="px-6 py-4">{a.transaction_count} deposits</td>
                  <td className="px-6 py-4 font-bold text-green-400">{Number(a.total_collected).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
