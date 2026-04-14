import { useState } from 'react';
import { Search, User, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function RiderLookup() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/cashier/rider-lookup?query=${query}`);
      if (data.status === 'success') {
        setResults(data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search rider');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Rider Lookup</h1>
      <p className="text-[#aeb2d5] text-sm">Search for a rider by phone number or email.</p>

      <form onSubmit={handleSearch} className="flex gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter phone number or email..."
            className="w-full bg-[#1a2255] border border-[#2B3EE6]/30 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#C8F000] transition-colors"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary min-w-[120px]">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">{error}</div>}

      <div className="space-y-4">
        {results.map((rider) => (
          <div key={rider.user_id} className="bg-[#1a2255] border border-[#2B3EE6]/30 p-6 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2B3EE6]/20 flex items-center justify-center text-[#2B3EE6]">
                <User size={24} />
              </div>
              <div>
                <h3 className="text-white font-medium">{rider.full_name}</h3>
                <p className="text-gray-400 text-sm mt-1">{rider.email} • {rider.phone_number}</p>
                {!rider.is_active && <span className="text-xs text-red-400 mt-1 inline-block bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">Inactive</span>}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate('/cashier/topup', { state: { rider } })} className="btn-secondary flex items-center gap-2">
                <CreditCard size={16} /> Top Up
              </button>
            </div>
          </div>
        ))}
        {results.length === 0 && !loading && !error && query && (
          <div className="text-center py-12 text-gray-500">No riders found.</div>
        )}
      </div>
    </div>
  );
}
