import React from 'react';

function EmptyState({ title, message }) {
  return <div className="empty-state"><b>{title}</b><p>{message}</p></div>;
}

function Status({ value }) {
  return <span className={`availability-status ${String(value || '').toLowerCase()}`}>{value || 'Unknown'}</span>;
}

export default function AdminDashboard({ summary = {}, parking = [], bookings = [], reports = [], users = [], onOpen }) {
  summary = summary || {};
  const pendingReports = reports.filter((report) => report.status === 'Pending').length;
  const available = parking.reduce((sum, location) => sum + Number(location.available || 0), 0);
  const total = parking.reduce((sum, location) => sum + Number(location.total || 0), 0);
  const metrics = [
    ['Total users', summary?.users ?? users.length, 'accounts', 'orange'],
    ['Parking locations', parking.length, 'locations', 'purple'],
    ['Total reservations', summary?.bookings ?? bookings.length, 'bookings', 'green'],
    ['Available slots', summary?.parking ?? available, 'spaces', 'orange'],
    ['Pending hazards', pendingReports, 'need review', 'purple'],
    ['Emergency simulations', 'Unavailable', 'not tracked by API', 'green'],
  ];
  const destinations = [
    ['adminParking', 'Parking management', 'Manage locations and capacity', 'P'],
    ['adminBookings', 'Booking management', 'Search and update reservations', 'B'],
    ['adminHazards', 'Hazard management', 'Review and resolve reports', '!'],
    ['users', 'User management', 'Search accounts and manage roles', 'U'],
    ['adminTraffic', 'Analytics', 'Filter booking and hazard reports', 'A'],
  ];
  const activity = [
    ...bookings.map((booking) => ({ id: `booking-${booking.id}`, title: 'Reservation update', detail: `${booking.service} · ${booking.route}`, status: booking.status, date: booking.date })),
    ...reports.map((report) => ({ id: `report-${report.id}`, title: 'Hazard report submitted', detail: `${report.type} · ${report.location}`, status: report.status, date: report.createdAt })),
    ...users.map((user) => ({ id: `user-${user.id}`, title: 'Account registered', detail: `${user.name} · ${user.email}`, status: user.enabled ? 'Active' : 'Disabled', date: user.createdAt })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);

  return <section className="admin-workspace dashboard-reference">
    <div className="admin-welcome"><div><span className="eyebrow">SMARTMOVE OPERATIONS</span><h2>Welcome, Admin</h2><p>Here’s what’s happening across SmartMove today.</p></div><span className="admin-live"><i/> Live account data</span></div>
    <div className="admin-metrics">{metrics.map(([label, value, note, tone]) => <article className={`admin-metric metric-${tone}`} key={label}><span className="metric-icon">{label.slice(0, 1)}</span><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div>
    <section className="admin-page-shortcuts" aria-label="Admin management pages">{destinations.map(([page, title, description, icon]) => <button key={page} onClick={() => onOpen(page)}><span>{icon}</span><div><b>{title}</b><small>{description}</small></div><i aria-hidden="true">→</i></button>)}</section>
    <div className="admin-dashboard-grid">
      <article className="panel admin-card"><div className="panel-title"><div><span className="eyebrow">PARKING</span><h2>Parking overview</h2></div><button className="text-button" onClick={() => onOpen('adminParking')}>View all</button></div>
        {parking.length ? <div className="table-scroll"><table><thead><tr><th>Location</th><th>Total</th><th>Occupied</th><th>Available</th><th>Status</th></tr></thead><tbody>{parking.slice(0, 5).map((item) => { const occupied = Math.max(0, Number(item.total || 0) - Number(item.available || 0)); const status = Number(item.available) === 0 ? 'Full' : Number(item.available) <= Math.max(2, Math.ceil(Number(item.total || 0) * 0.2)) ? 'Limited' : 'Available'; return <tr key={item.id}><td>{item.name}</td><td>{item.total}</td><td>{occupied}</td><td>{item.available}</td><td><Status value={status}/></td></tr>; })}</tbody></table></div> : <EmptyState title="No parking locations" message="Parking records will appear here when added."/>}</article>
      <article className="panel admin-card"><div className="panel-title"><div><span className="eyebrow">ROAD SAFETY</span><h2>Recent hazard reports</h2></div><button className="text-button" onClick={() => onOpen('adminHazards')}>View all</button></div>
        {reports.length ? <div className="table-scroll"><table><thead><tr><th>Type</th><th>Location</th><th>Date</th><th>Status</th></tr></thead><tbody>{reports.slice(0, 5).map((report) => <tr key={report.id}><td>{report.type}</td><td>{report.location}</td><td>{report.occurredAt || report.createdAt ? new Date(report.occurredAt || report.createdAt).toLocaleDateString() : '—'}</td><td><Status value={report.status}/></td></tr>)}</tbody></table></div> : <EmptyState title="No hazard reports" message="New reports will appear here."/>}</article>
      <article className="panel admin-card emergency-preview"><div className="panel-title"><div><span className="eyebrow">DEMONSTRATION ONLY</span><h2>Emergency priority</h2></div><Status value="Normal"/></div><div className="signal-preview"><div className="signal-road"><span aria-hidden="true">E</span><i/><i/></div><div className="traffic-light"><i/><i/><i/></div></div><p className="muted">Simulation preview only. This does not control real traffic signals.</p><button className="button primary" onClick={() => onOpen('adminEmergency')}>Open simulation</button></article>
      <article className="panel admin-card"><div className="panel-title"><div><span className="eyebrow">CAPACITY</span><h2>Parking usage</h2></div><button className="text-button" onClick={() => onOpen('adminTraffic')}>Analytics</button></div><div className="capacity-total"><b>{total ? `${available} / ${total}` : '—'}</b><span>available parking spaces</span></div>{parking.length ? parking.slice(0, 4).map((item) => <div className="usage-row" key={item.id}><span><b>{item.name}</b><small>{item.available} available of {item.total}</small></span><div className="usage-track"><i style={{ width: `${item.total ? Math.round(item.available / item.total * 100) : 0}%` }}/></div></div>) : <EmptyState title="No capacity data" message="Parking usage will appear when locations are available."/>}</article>
      <article className="panel admin-card"><div className="panel-title"><div><span className="eyebrow">LATEST UPDATES</span><h2>Recent activity</h2></div><button className="text-button" onClick={() => onOpen('adminNotifications')}>Notifications</button></div>{activity.length ? activity.map((item) => <div className="report-line" key={item.id}><span className="activity-dot"/><span><b>{item.title}</b><small>{item.detail}</small></span><em>{item.status}</em></div>) : <EmptyState title="No recent activity" message="Account, reservation and hazard updates will appear here."/>}</article>
    </div>
  </section>;
}
