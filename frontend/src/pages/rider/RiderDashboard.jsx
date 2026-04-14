import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Battery, Repeat, MapPin, CreditCard } from 'lucide-react';
import API from '../../services/api';

export default function RiderDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ swaps: 0, stations: 0, soh: '--', balance: '--' });

  useEffect(() => {
    const load = async () => {
      try {
        const [swapsRes, stationsRes, subRes] = await Promise.all([
          API.get(`/swaps/history/${user.user_id}`),
          API.get('/stations'),
          API.get(`/subscriptions/${user.user_id}`).catch(() => null),
        ]);

        const swaps    = swapsRes.data.data ?? [];
        const stations = stationsRes.data.data ?? [];
        const sub      = subRes?.data?.data ?? null;

        // Try to get SoH from last swap's battery
        let soh = '--';
        const lastSwap = swaps.find(s => s.status === 'COMPLETED');
        if (lastSwap) {
          const battRes = await API.get(`/batteries/${lastSwap.battery_received_id}`).catch(() => null);
          if (battRes) soh = battRes.data.data?.state_of_health ?? '--';
        }

        setStats({
          swaps:    swaps.length,
          stations: stations.length,
          soh,
          balance:  sub ? `${parseFloat(sub.balance).toLocaleString()} RWF` : 'No plan',
        });
      } catch { /* silently handle */ }
    };
    load();
  }, [user]);

  const cards = [
    { label: 'Total Swaps',     value: stats.swaps,    icon: Repeat,    color: 'text-spiro-400', to: '/rider/swap' },
    { label: 'Active Stations', value: stats.stations, icon: MapPin,    color: 'text-blue-400',  to: '/rider/stations' },
    { label: 'Battery SoH',     value: stats.soh === '--' ? '--' : `${stats.soh}%`, icon: Battery, color: 'text-yellow-400', to: '/rider/battery' },
    { label: 'Balance',         value: stats.balance,  icon: CreditCard,color: 'text-purple-400',to: '/rider/subscription' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, <span className="text-spiro-400">{user?.full_name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-white/50 text-sm mt-1">Here's your battery ecosystem overview.</p>
      </div>

      {/* Stat Cards — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, to }) => (
          <Link key={label} to={to} className="stat-card hover:scale-105 transition-transform">
            <Icon size={22} className={color} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-white/50 text-xs">{label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/rider/swap"         className="btn-primary text-center text-sm">Swap Battery Now</Link>
          <Link to="/rider/stations"     className="btn-secondary text-center text-sm">Find a Station</Link>
          <Link to="/rider/subscription" className="btn-secondary text-center text-sm">My Subscription</Link>
        </div>
      </div>
    </div>
  );
}
