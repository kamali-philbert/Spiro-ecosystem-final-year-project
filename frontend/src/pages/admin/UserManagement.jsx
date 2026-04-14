import { useEffect, useState } from 'react';
import API from '../../services/api';
import { Users, Trash2, UserCheck, UserX, UserPlus, X, CheckCircle, AlertCircle } from 'lucide-react';

const roleBadge = r => r === 'ADMIN' ? 'badge-red' : r === 'TECHNICIAN' ? 'badge-yellow' : r === 'CASHIER' ? 'badge-purple' : 'badge-blue';
const statusBadge = (u) => {
  if (!u.is_active && u.role === 'RIDER') return { cls: 'badge-orange', label: 'Pending Approval' };
  return u.is_active ? { cls: 'badge-green', label: 'Active' } : { cls: 'badge-gray', label: 'Inactive' };
};

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'RIDER', phone_number: '' };

export default function UserManagement() {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [feedback,   setFeedback]   = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = () => {
    API.get('/admin/users')
      .then(r => setUsers(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleActive = async (id, isActive) => {
    await API.put(`/admin/users/${id}`, { is_active: !isActive });
    load();
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    await API.delete(`/admin/users/${id}`);
    load();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await API.post('/auth/register', form);
      setFeedback({ type: 'success', msg: `${form.role} account created for ${form.full_name}.` });
      setForm(EMPTY_FORM);
      load();
      // Auto-close modal after 1.5s
      setTimeout(() => { setShowModal(false); setFeedback(null); }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message ?? 'Failed to create user.' });
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setFeedback(null); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-white/50 text-sm">
            Manage all riders, technicians, and admins.{' '}
            {users.filter(u => !u.is_active && u.role === 'RIDER').length > 0 && (
              <span className="inline-flex items-center gap-1 text-orange-400 font-medium">
                · {users.filter(u => !u.is_active && u.role === 'RIDER').length} pending approval
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <UserPlus size={16} /> Create User
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr>
                {['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(u => (
                <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 text-white/50">{u.user_id}</td>
                  <td className="px-5 py-3 text-white font-medium">{u.full_name}</td>
                  <td className="px-5 py-3 text-white/60">{u.email}</td>
                  <td className="px-5 py-3 text-white/50">{u.phone_number ?? '—'}</td>
                  <td className="px-5 py-3"><span className={roleBadge(u.role)}>{u.role}</span></td>
                  <td className="px-5 py-3">
                    {(() => { const s = statusBadge(u); return <span className={s.cls}>{s.label}</span>; })()}
                  </td>
                  <td className="px-5 py-3 flex items-center gap-2">
                    <button onClick={() => toggleActive(u.user_id, u.is_active)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                      title={u.is_active ? 'Deactivate' : 'Activate'}>
                      {u.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>
                    <button onClick={() => deleteUser(u.user_id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center text-white/30 py-10">No users in the system.</p>
          )}
          {users.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
              <p className="text-white/40 text-xs">
                Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, users.length)} of {users.length}
              </p>
              <div className="flex gap-2">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                  className="px-3 py-1 text-xs rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                  Prev
                </button>
                <button disabled={page*PAGE_SIZE>=users.length} onClick={() => setPage(p=>p+1)}
                  className="px-3 py-1 text-xs rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass w-full max-w-md p-6 space-y-5 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Create New User</h2>
                <p className="text-white/40 text-xs mt-0.5">Account will be active immediately.</p>
              </div>
              <button onClick={closeModal} className="text-white/30 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${
                feedback.type === 'success'
                  ? 'bg-spiro-500/10 text-spiro-400 border-spiro-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {feedback.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {feedback.msg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Full Name</label>
                <input type="text" placeholder="e.g. Jean Pierre" required
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Email</label>
                <input type="email" placeholder="user@spiro.rw" required
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Phone Number</label>
                <input type="text" placeholder="+250 7XX XXX XXX"
                  value={form.phone_number}
                  onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Password</label>
                <input type="password" placeholder="Min. 6 characters" required minLength={6}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-1 block">Role</label>
                <select value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="input-field bg-gray-900 text-white">
                  <option value="RIDER" className="bg-gray-900">Rider</option>
                  <option value="TECHNICIAN" className="bg-gray-900">Technician</option>
                  <option value="CASHIER" className="bg-gray-900">Cashier</option>
                  <option value="ADMIN" className="bg-gray-900">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <UserPlus size={15} />}
                  {submitting ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
