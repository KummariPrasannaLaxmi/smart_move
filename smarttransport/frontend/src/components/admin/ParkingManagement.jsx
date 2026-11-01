import React, { useMemo, useState } from 'react';
import { api } from '../../services/api.js';

const freshForm = { name: '', address: '', distance: '', total: 20, available: 20, price: 0, status: 'Open' };

export default function ParkingManagement({ parking = [], onReload, onNotify }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(freshForm);
  const [saving, setSaving] = useState(false);
  const filtered = useMemo(() => parking.filter((item) => `${item.name} ${item.address} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [parking, query]);
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    const payload = { ...form, total: Number(form.total), available: Number(form.available), price: Number(form.price) };
    const id = editing?.id?.replace(/^p/, '');
    try { await api(id ? `/api/parking/${id}` : '/api/parking', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); onNotify('Parking location saved.'); setEditing(null); setForm(freshForm); await onReload(); }
    catch (error) { onNotify(error.message); }
    finally { setSaving(false); }
  };
  const remove = async (item) => {
    try { await api(`/api/parking/${String(item.id).replace(/^p/, '')}`, { method: 'DELETE' }); onNotify('Parking location removed.'); await onReload(); }
    catch (error) { onNotify(error.message); }
  };
  return <section className="admin-manage-grid"><article className="panel"><div className="panel-title"><div><span className="eyebrow">PARKING INVENTORY</span><h2>{editing ? 'Edit location' : 'Add parking location'}</h2></div></div>
    <form className="form-stack admin-edit-form" onSubmit={save}><label>Location name<input value={form.name} onChange={(e) => update('name', e.target.value)} required maxLength="120"/></label><label>Address<input value={form.address} onChange={(e) => update('address', e.target.value)} required maxLength="240"/></label><label>Distance label<input value={form.distance} onChange={(e) => update('distance', e.target.value)} placeholder="e.g. 0.4 km"/></label><div className="admin-number-grid"><label>Total slots<input type="number" min="1" value={form.total} onChange={(e) => update('total', e.target.value)} required/></label><label>Available slots<input type="number" min="0" max={form.total} value={form.available} onChange={(e) => update('available', e.target.value)} required/></label><label>Price per hour<input type="number" min="0" value={form.price} onChange={(e) => update('price', e.target.value)} required/></label><label>Status<select value={form.status} onChange={(e) => update('status', e.target.value)}><option>Open</option><option>Closed</option><option>Full</option></select></label></div><div className="button-row"><button className="button primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add location'}</button>{editing && <button type="button" className="button secondary" onClick={() => { setEditing(null); setForm(freshForm); }}>Cancel</button>}</div></form>
  </article><article className="panel table-panel"><div className="panel-title"><div><span className="eyebrow">DATABASE RECORDS</span><h2>Parking locations</h2></div><span className="status-pill">{parking.length} locations</span></div><label className="table-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search parking locations"/></label>
    {filtered.length ? <div className="table-scroll"><table><thead><tr><th>Name</th><th>Area</th><th>Slots</th><th>Rate / hr</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.address}</td><td>{item.available} / {item.total}</td><td>₹{item.price}</td><td><span className="status-pill">{item.status}</span></td><td><div className="table-actions"><button className="text-button" onClick={() => { setEditing(item); setForm({ name: item.name, address: item.address, distance: item.distance || '', total: item.total, available: item.available, price: item.price, status: item.status }); }}>Edit</button><button className="text-button danger" onClick={() => remove(item)}>Remove</button></div></td></tr>)}</tbody></table></div> : <div className="empty">{parking.length ? 'No parking locations match this search.' : 'No parking locations have been added yet.'}</div>}
  </article></section>;
}
