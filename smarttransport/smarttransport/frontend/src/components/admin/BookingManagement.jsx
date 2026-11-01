import React, { useMemo, useState } from 'react';
import { api } from '../../services/api.js';

export default function BookingManagement({ bookings = [], onReload, onNotify }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [updating, setUpdating] = useState(null);
  const filtered = useMemo(() => bookings.filter((item) => (status === 'All statuses' || item.status === status) && `${item.id} ${item.userEmail} ${item.service} ${item.route} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [bookings, query, status]);
  const updateStatus = async (item, next) => {
    setUpdating(item.id);
    try { await api(`/api/bookings/${item.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) }); onNotify('Booking status updated.'); await onReload(); }
    catch (error) { onNotify(error.message); }
    finally { setUpdating(null); }
  };
  return <section className="panel table-panel"><div className="panel-title"><div><span className="eyebrow">SHARED RESERVATION DATA</span><h2>Booking management</h2></div><span className="status-pill">{bookings.length} bookings</span></div>
    <div className="admin-filter-row"><label className="table-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search account, service, route or reference"/></label><select aria-label="Filter bookings by status" value={status} onChange={(e) => setStatus(e.target.value)}><option>All statuses</option><option>Confirmed</option><option>Completed</option><option>Cancelled</option></select></div>
    {filtered.length ? <div className="table-scroll"><table><thead><tr><th>Reference</th><th>Account</th><th>Service</th><th>Route</th><th>Amount</th><th>Date</th><th>Status</th><th>Update</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>#{item.id}</td><td>{item.userEmail || 'Legacy record'}</td><td>{item.service}</td><td>{item.route}</td><td>₹{item.price}</td><td>{item.date ? new Date(item.date).toLocaleString() : '—'}</td><td><span className="status-pill">{item.status}</span></td><td><select aria-label={`Update booking ${item.id}`} value={item.status} disabled={updating === item.id} onChange={(e) => updateStatus(item, e.target.value)}><option>Confirmed</option><option>Completed</option><option>Cancelled</option></select></td></tr>)}</tbody></table></div> : <div className="empty">{bookings.length ? 'No bookings match these filters.' : 'No bookings have been created yet.'}</div>}
  </section>;
}
