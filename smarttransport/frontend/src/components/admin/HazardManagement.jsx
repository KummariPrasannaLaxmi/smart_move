import React, { useMemo, useState } from 'react';
import { api } from '../../services/api.js';

export default function HazardManagement({ reports = [], onReload, onNotify }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [updating, setUpdating] = useState(null);
  const filtered = useMemo(() => reports.filter((item) => (status === 'All statuses' || item.status === status) && `${item.type} ${item.userEmail} ${item.location} ${item.description} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [reports, query, status]);
  const updateStatus = async (item, next) => {
    setUpdating(item.id);
    try { await api(`/api/reports/${item.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) }); onNotify('Hazard report status updated.'); await onReload(); }
    catch (error) { onNotify(error.message); }
    finally { setUpdating(null); }
  };
  return <section className="panel table-panel"><div className="panel-title"><div><span className="eyebrow">ROAD SAFETY OPERATIONS</span><h2>Hazard management</h2></div><span className="status-pill">{reports.filter((item) => item.status === 'Pending').length} pending</span></div>
    <div className="admin-filter-row"><label className="table-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search hazard, reporter or location"/></label><select aria-label="Filter hazard reports by status" value={status} onChange={(e) => setStatus(e.target.value)}><option>All statuses</option><option>Pending</option><option>Reviewing</option><option>Resolved</option><option>Rejected</option></select></div>
    {filtered.length ? <div className="table-scroll"><table><thead><tr><th>Type</th><th>Reporter</th><th>Location</th><th>Description</th><th>Date</th><th>Status</th><th>Review</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.type}</td><td>{item.userEmail || 'Legacy record'}</td><td>{item.location}</td><td>{item.description}</td><td>{item.occurredAt || item.createdAt ? new Date(item.occurredAt || item.createdAt).toLocaleString() : '—'}</td><td><span className="status-pill">{item.status}</span></td><td><select aria-label={`Review hazard report ${item.id}`} value={item.status} disabled={updating === item.id} onChange={(e) => updateStatus(item, e.target.value)}><option>Pending</option><option>Reviewing</option><option>Resolved</option><option>Rejected</option></select></td></tr>)}</tbody></table></div> : <div className="empty">{reports.length ? 'No hazard reports match these filters.' : 'No hazard reports have been submitted yet.'}</div>}
  </section>;
}
