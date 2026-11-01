import React, { useMemo, useState } from 'react';

function CountBars({ title, rows, labelKey }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return <article className="panel analytics-chart"><div className="panel-title"><h2>{title}</h2></div>{rows.length ? rows.map((row) => <div className="analytics-bar-row" key={row.label}><span>{row.label}</span><div className="usage-track"><i style={{ width: `${Math.max(4, row.count / max * 100)}%` }} /></div><b>{row.count}</b></div>) : <div className="empty">No {labelKey} data for this date range.</div>}</article>;
}

export default function Analytics({ summary, parking = [], bookings = [], reports = [] }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const withinRange = (value) => {
    if (!value) return !from && !to;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return !from && !to;
    return (!from || date >= new Date(`${from}T00:00:00`)) && (!to || date <= new Date(`${to}T23:59:59.999`));
  };
  const filteredBookings = useMemo(() => bookings.filter((item) => withinRange(item.date)), [bookings, from, to]);
  const filteredReports = useMemo(() => reports.filter((item) => withinRange(item.occurredAt || item.createdAt)), [reports, from, to]);
  const bookingStatus = useMemo(() => ['Confirmed', 'Completed', 'Cancelled'].map((label) => ({ label, count: filteredBookings.filter((item) => item.status === label).length })).filter((item) => item.count), [filteredBookings]);
  const hazardStatus = useMemo(() => ['Pending', 'Reviewing', 'Resolved', 'Rejected'].map((label) => ({ label, count: filteredReports.filter((item) => item.status === label).length })).filter((item) => item.count), [filteredReports]);
  const parkingUsage = parking.map((item) => ({ label: item.name, count: Math.max(0, Number(item.total || 0) - Number(item.available || 0)), total: Number(item.total || 0) }));
  const bookingDays = useMemo(() => {
    const counts = new Map();
    filteredBookings.forEach((item) => { const key = item.date ? new Date(item.date).toLocaleDateString() : 'Date unavailable'; counts.set(key, (counts.get(key) || 0) + 1); });
    return [...counts].map(([label, count]) => ({ label, count })).slice(-10);
  }, [filteredBookings]);
  return <section className="analytics-page">
    <div className="panel analytics-filters"><div><span className="eyebrow">REPORTING PERIOD</span><h2>Transport analytics</h2><p className="muted">Parking, booking and hazard values come from SmartMove records.</p></div><div className="admin-filter-row"><label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><button className="button secondary" onClick={() => { setFrom(''); setTo(''); }}>Clear dates</button></div></div>
    <div className="stats-grid analytics-stats"><article className="stat-card"><span className="stat-icon">P</span><span><small>AVAILABLE SPACES</small><b>{summary?.parking ?? '—'}</b></span></article><article className="stat-card"><span className="stat-icon">B</span><span><small>BOOKINGS IN RANGE</small><b>{filteredBookings.length}</b></span></article><article className="stat-card"><span className="stat-icon">!</span><span><small>HAZARDS IN RANGE</small><b>{filteredReports.length}</b></span></article><article className="stat-card"><span className="stat-icon">P</span><span><small>TOTAL CAPACITY</small><b>{summary?.parkingTotal ?? parking.reduce((sum, item) => sum + Number(item.total || 0), 0)}</b></span></article></div>
    <div className="analytics-chart-grid"><CountBars title="Bookings by date" rows={bookingDays} labelKey="booking" /><CountBars title="Booking status" rows={bookingStatus} labelKey="booking" /><CountBars title="Hazard report status" rows={hazardStatus} labelKey="hazard" /><article className="panel analytics-chart"><div className="panel-title"><h2>Parking occupancy</h2></div>{parkingUsage.length ? parkingUsage.map((item) => <div className="analytics-bar-row" key={item.label}><span>{item.label}</span><div className="usage-track"><i style={{ width: `${item.total ? Math.max(0, item.count / item.total * 100) : 0}%` }} /></div><b>{item.total ? `${Math.round(item.count / item.total * 100)}%` : '—'}</b></div>) : <div className="empty">No parking locations available.</div>}</article></div>
  </section>;
}
