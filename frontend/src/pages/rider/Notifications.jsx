import { useEffect, useState } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Bell, CheckCheck, BellOff } from 'lucide-react';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    API.get(`/notifications/${user.user_id}`)
      .then(r => setNotifications(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [user.user_id]);

  const markRead = async (id) => {
    await API.put(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => API.put(`/notifications/${n.notification_id}/read`).catch(() => {})));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-white/50 text-sm">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-2 text-xs text-[#C8F000] border border-[#C8F000]/30 bg-[#C8F000]/10 px-3 py-1.5 rounded-lg hover:bg-[#C8F000]/20 transition">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center py-20 text-white/30">
          <BellOff size={36} className="mb-3 opacity-30" />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.notification_id}
              className={`glass px-5 py-4 flex items-start gap-4 transition-all ${!n.is_read ? 'border-l-2 border-[#C8F000]' : 'opacity-60'}`}>
              <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-[#C8F000]/15' : 'bg-white/5'}`}>
                <Bell size={15} className={!n.is_read ? 'text-[#C8F000]' : 'text-white/30'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.is_read ? 'text-white' : 'text-white/60'}`}>{n.message}</p>
                <p className="text-white/30 text-xs mt-1">
                  {new Date(n.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              {!n.is_read && (
                <button onClick={() => markRead(n.notification_id)}
                  className="text-xs text-white/30 hover:text-white/60 shrink-0 transition">
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
