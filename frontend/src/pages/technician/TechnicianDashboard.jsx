import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { Wrench, ClipboardList, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ flagged: 0, open: 0, inProgress: 0, resolved: 0 });
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [batteriesRes, ticketsRes] = await Promise.all([
          API.get('/batteries'),
          API.get('/tickets'),
        ]);
        const batteries = batteriesRes.data.data ?? [];
        const tickets   = ticketsRes.data.data ?? [];

        setStats({
          flagged:    batteries.filter(b => b.status === 'FLAGGED').length,
          open:       tickets.filter(t => t.status === 'OPEN').length,
          inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
          resolved:   tickets.filter(t => t.status === 'RESOLVED').length,
        });
        setRecentTickets(tickets.slice(0, 5));
      } catch { /* handle gracefully */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const cards = [
    { label: 'Flagged Batteries',  value: stats.flagged,    icon: AlertTriangle, color: 'text-red-400',    glow: 'shadow-red-900/30' },
    { label: 'Open Tickets',       value: stats.open,       icon: ClipboardList, color: 'text-yellow-400', glow: 'shadow-yellow-900/30' },
    { label: 'In Progress',        value: stats.inProgress, icon: Wrench,        color: 'text-spiro-400',  glow: 'shadow-spiro-900/30' },
    { label: 'Resolved Today',     value: stats.resolved,   icon: CheckCircle,   color: 'text-green-400',  glow: 'shadow-green-900/30' },
  ];

  const ticketBadge = (s) => {
    if (s === 'RESOLVED')   return 'badge-green';
    if (s === 'OPEN')       return 'badge-red';
    if (s === 'IN_PROGRESS') return 'badge-yellow';
    return 'badge-gray';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome, <span className="text-spiro-400">{user?.full_name?.split(' ')[0]}</span> 🔧
        </h1>
        <p className="text-white/50 text-sm mt-1">Your technician overview for today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, glow }) => (
          <div key={label} className={`stat-card shadow-lg ${glow}`}>
            <Icon size={22} className={color} />
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-white/50 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/technician/portal"    className="btn-primary text-center text-sm">Diagnostic Portal</Link>
          <Link to="/technician/checklist" className="btn-secondary text-center text-sm">Maintenance Checklist</Link>
          <Link to="/technician/tickets"   className="btn-secondary text-center text-sm">Repair Tickets</Link>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Tickets</h2>
          <Link to="/technician/tickets" className="text-spiro-400 text-sm flex items-center gap-1 hover:text-spiro-300 transition-colors">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center h-20 items-center">
            <div className="w-6 h-6 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentTickets.length === 0 ? (
          <p className="text-white/30 text-sm">No tickets yet.</p>
        ) : (
          <div className="space-y-2">
            {recentTickets.map(t => (
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
