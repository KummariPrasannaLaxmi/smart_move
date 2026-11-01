import React, { useMemo, useState } from 'react';
import { api } from '../../services/api.js';

export default function EmergencyRequestManagement({ requests = [], onReload, onNotify }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [updating, setUpdating] = useState(null);
  const filtered = useMemo(() => requests.filter((item) => (status === 'All statuses' || item.status === status) && `${item.type} ${item.location} ${item.description} ${item.userEmail}`.toLowerCase().includes(query.toLowerCase())), [requests, status, query]);
  const updateStatus = async (item, next) => {
    setUpdating(item.id);
    try { await api(`/api/emergency-requests/${item.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) }); onNotify('Emergency request updated.'); await onReload(); }
    catch (error) { onNotify(error.message); }
    finally { setUpdating(null); }
  };
  return <section className="panel table-panel"><div className="panel-title"><div><span className="eyebrow">RESPONSE OPERATIONS</span><h2>Emergency requests</h2></div><span className="status-pill">{requests.filter((item) => item.status === 'Pending').length} pending</span></div>
    <div className="admin-filter-row"><label className="table-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search type, location or reporter"/></label><select aria-label="Filter emergency requests by status" value={status} onChange={(e) => setStatus(e.target.value)}><option>All statuses</option><option>Pending</option><option>In Progress</option><option>Resolved</option><option>Rejected</option></select></div>
    {filtered.length ? <div className="table-scroll"><table><thead><tr><th>Type</th><th>Reporter</th><th>Location</th><th>Description</th><th>Reported</th><th>Status</th><th>Update</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.type}</td><td>{item.userEmail}</td><td>{item.location}</td><td>{item.description}</td><td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td><td>{item.status}</td><td><select aria-label={`Update emergency request ${item.id}`} value={item.status} disabled={updating === item.id} onChange={(e) => updateStatus(item, e.target.value)}><option>Pending</option><option>In Progress</option><option>Resolved</option><option>Rejected</option></select></td></tr>)}</tbody></table></div> : <div className="empty">{requests.length ? 'No emergency requests match these filters.' : 'No emergency requests have been received.'}</div>}
  </section>;
}
