import React, { useMemo, useState } from 'react';
import { api } from '../../services/api.js';

export default function UserManagement({ users = [], currentEmail, onReload, onNotify }) {
  const [query, setQuery] = useState('');
  const [updating, setUpdating] = useState(null);
  const filtered = useMemo(() => users.filter((user) => `${user.name} ${user.email} ${user.phone || ''} ${user.role}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const request = async (user, url, payload) => {
    setUpdating(user.id);
    try { const result = await api(url, { method: 'PATCH', body: JSON.stringify(payload) }); onNotify('Account updated.'); await onReload(); return result; }
    catch (error) { onNotify(error.message); }
    finally { setUpdating(null); }
  };
  return <section className="panel table-panel"><div className="panel-title"><div><span className="eyebrow">ACCOUNT DIRECTORY</span><h2>User management</h2></div><span className="status-pill">{users.length} accounts</span></div>
    <label className="table-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, phone or role"/></label>
    {filtered.length ? <div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Created</th><th>Account status</th><th>Actions</th></tr></thead><tbody>{filtered.map((user) => { const isSelf = user.email?.toLowerCase() === currentEmail?.toLowerCase(); return <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.phone || '—'}</td><td><select aria-label={`Change role for ${user.email}`} value={user.role} disabled={isSelf || updating === user.id} onChange={(e) => request(user, `/api/admin/users/${user.id}/role`, { role: e.target.value })}><option value="USER">User</option><option value="ADMIN">Admin</option></select></td><td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td><td><span className="status-pill">{user.enabled ? 'Active' : 'Disabled'}</span></td><td><button className="text-button" disabled={isSelf || updating === user.id} onClick={() => request(user, `/api/admin/users/${user.id}/enabled`, { enabled: !user.enabled })}>{user.enabled ? 'Deactivate' : 'Activate'}</button></td></tr>; })}</tbody></table></div> : <div className="empty">{users.length ? 'No accounts match this search.' : 'No user accounts were returned.'}</div>}
  </section>;
}
