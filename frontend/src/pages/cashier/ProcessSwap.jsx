import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function ProcessSwap() {
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSwaps();
  }, []);

  const fetchSwaps = async () => {
    try {
      const { data } = await api.get('/swaps');
      if (data.status === 'success') {
        setSwaps(data.data.filter(s => s.status === 'PENDING'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (transaction_id) => {
    try {
      const { data } = await api.post('/swaps/confirm', { transaction_id });
      if (data.status === 'success') {
         fetchSwaps();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error confirming swap');
    }
  };

  if (loading) return <div className="text-[#aeb2d5]">Loading pending swaps...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Process Swaps</h1>
      <p className="text-[#aeb2d5] text-sm">Confirm pending swaps initiated by riders.</p>
      
      <div className="grid gap-4 mt-6">
        {swaps.length === 0 ? (
          <div className="text-center py-12 text-[#aeb2d5] bg-[#1a2255] rounded-xl border border-[#2B3EE6]/30">No pending swaps to process.</div>
        ) : (
          swaps.map(swap => (
            <div key={swap.transaction_id} className="bg-[#1a2255] border border-[#2B3EE6]/30 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{swap.rider_name}</p>
                <p className="text-[#aeb2d5] text-sm mt-1">Station: {swap.station_name}</p>
                <p className="text-[#aeb2d5] text-sm">Returned SOC: {swap.soc_at_return}%</p>
              </div>
              <button onClick={() => handleConfirm(swap.transaction_id)} className="btn-primary flex items-center gap-2">
                <CheckCircle size={16} /> Confirm Swap
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
