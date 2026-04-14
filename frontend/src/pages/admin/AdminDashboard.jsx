import { useEffect, useState } from 'react';
import API from '../../services/api';
import { Battery, Zap, Users, Repeat, AlertTriangle, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, batteries: 0, flagged: 0, stations: 0, swaps: 0 });
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, batteriesRes, stationsRes, ticketsRes] = await Promise.all([
          API.get('/admin/users'),
          API.get('/batteries'),
          API.get('/stations'),
          API.get('/tickets'),
        ]);
        const batteries = batteriesRes.data.data ?? [];
        setStats({
          users:    usersRes.data.data?.length ?? 0,
          batteries: batteries.length,
          flagged:  batteries.filter(b => b.status === 'FLAGGED').length,
          stations: stationsRes.data.data?.length ?? 0,
        });
        setTickets((ticketsRes.data.data ?? []).slice(0, 5));
      } catch { /* handle gracefully */ }
    };
    load();
  }, []);

  const cards = [
    { label: 'Total Users',      value: stats.users,    icon: Users,   color: 'text-blue-400',   glow: 'shadow-blue-900/30' },
    { label: 'Batteries',        value: stats.batteries, icon: Battery, color: 'text-spiro-400', glow: 'shadow-spiro-900/30' },
    { label: 'Flagged Batteries',value: stats.flagged,  icon: AlertTriangle, color: 'text-red-400', glow: 'shadow-red-900/30' },
    { label: 'Active Stations',  value: stats.stations, icon: Zap,     color: 'text-yellow-400', glow: 'shadow-yellow-900/30' },
  ];

  const ticketBadge = (s) => {
    if (s === 'RESOLVED') return 'badge-green';
    if (s === 'OPEN') return 'badge-red';
    if (s === 'IN_PROGRESS') return 'badge-yellow';
    return 'badge-gray';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-white/50 text-sm">Fleet overview and system analytics.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, glow }) => (
          <div key={label} className={`stat-card shadow-lg ${glow}`}>
            <Icon size={22} className={color} />
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-white/50 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Tickets */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent AI-Generated Repair Tickets</h2>
        {tickets.length === 0 ? (
          <p className="text-white/30 text-sm">No tickets yet — AI predictive maintenance will log them here.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => (
              <div key={t.ticket_id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">Ticket #{t.ticket_id} — Battery {t.battery_id}</p>
                  <p className="text-white/40 text-xs truncate max-w-xs">{t.issue_description}</p>
                </div>
                <span className={ticketBadge(t.status)}>{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
