import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Zap, MapPin, Repeat, Wrench, ClipboardList,
  Users, BarChart3, BellRing, LogOut, Battery, CreditCard, Building2, History, Bell, FileText
} from 'lucide-react';

const riderLinks = [
  { to: '/rider/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/rider/stations',       icon: MapPin,          label: 'Find Stations' },
  { to: '/rider/swap',           icon: Repeat,          label: 'Swap Battery' },
  { to: '/rider/swap-history',   icon: History,         label: 'Swap History' },
  { to: '/rider/battery',        icon: Battery,         label: 'My Battery' },
  { to: '/rider/subscription',   icon: CreditCard,      label: 'Subscription' },
  { to: '/rider/notifications',  icon: Bell,            label: 'Notifications' },
];

const techLinks = [
  { to: '/technician/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/technician/portal',    icon: Wrench,          label: 'Diagnostic Portal' },
  { to: '/technician/checklist', icon: Battery,         label: 'Checklist' },
  { to: '/technician/tickets',   icon: ClipboardList,   label: 'Repair Tickets' },
];

const cashierLinks = [
  { to: '/cashier/dashboard',     icon: LayoutDashboard, label: 'Daily Report' },
  { to: '/cashier/rider-lookup',  icon: Users,           label: 'Rider Lookup' },
  { to: '/cashier/topup',         icon: CreditCard,      label: 'Payment Processing' },
  { to: '/cashier/process-swap',  icon: Repeat,          label: 'Process Swap' },
  { to: '/cashier/daily-summary', icon: ClipboardList,   label: 'Daily Summary' },
];

const adminLinks = [
  { to: '/admin/dashboard',        icon: LayoutDashboard, label: 'Dashboard',     group: 'Overview' },
  { to: '/admin/fleet',            icon: Zap,             label: 'Fleet Map',      group: 'Overview' },
  { to: '/admin/alerts',           icon: BellRing,        label: 'AI Alerts',      group: 'Overview' },
  { to: '/admin/analytics',        icon: BarChart3,       label: 'Analytics',      group: 'Overview' },
  { to: '/admin/batteries',        icon: Battery,         label: 'Battery Health', group: 'Manage' },
  { to: '/admin/manage-batteries', icon: Battery,         label: 'Add Batteries',  group: 'Manage' },
  { to: '/admin/stations',         icon: Building2,       label: 'Stations',       group: 'Manage' },
  { to: '/admin/users',            icon: Users,           label: 'Users',          group: 'Manage' },
  { to: '/admin/subscriptions',    icon: CreditCard,      label: 'Subscriptions',  group: 'Manage' },
  { to: '/admin/reports',          icon: FileText,        label: 'Daily Reports',  group: 'Manage' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';
  const isCashier = user?.role === 'CASHIER';
  const links = isAdmin ? adminLinks : isCashier ? cashierLinks : user?.role === 'TECHNICIAN' ? techLinks : riderLinks;
  const handleLogout = () => { logout(); navigate('/login'); };
  const groups = isAdmin ? [...new Set(adminLinks.map(l => l.group))] : null;

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0d1230] border-r border-[#2B3EE6]/30 flex flex-col z-30">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#2B3EE6]/30 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#2B3EE6] flex items-center justify-center shadow-lg">
          <Zap size={16} className="text-[#C8F000]" />
        </div>
        <div>
          <span className="text-[#C8F000] font-bold text-sm leading-none">spiro</span>
          <p className="text-white/40 text-xs">Ecosystem</p>
        </div>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#2B3EE6]/30 shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#2B3EE6] flex items-center justify-center text-[#C8F000] font-bold text-xs shrink-0">
          {user?.full_name?.[0] ?? 'U'}
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
          <span className="badge-yellow" style={{ fontSize: '10px', padding: '1px 6px' }}>{user?.role}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-thin">
        {isAdmin ? (
          groups.map(group => (
            <div key={group} className="mb-1">
              <p className="text-white/25 text-xs font-semibold uppercase tracking-widest px-3 py-1.5">{group}</p>
              {adminLinks.filter(l => l.group === group).map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[#C8F000]/15 text-[#C8F000] border border-[#C8F000]/30'
                        : 'text-white/50 hover:text-white hover:bg-[#2B3EE6]/30'
                    }`}>
                  <Icon size={15} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))
        ) : (
          links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#C8F000]/15 text-[#C8F000] border border-[#C8F000]/30'
                    : 'text-white/50 hover:text-white hover:bg-[#2B3EE6]/30'
                }`}>
              <Icon size={15} />
              <span>{label}</span>
            </NavLink>
          ))
        )}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-[#2B3EE6]/30 shrink-0">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
