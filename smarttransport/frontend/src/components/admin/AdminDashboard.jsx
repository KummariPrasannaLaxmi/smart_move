import React from 'react';

function Empty({ children }) { return <div className="admin-empty">{children}</div>; }
function Status({ value }) { return <span className={`availability-status ${String(value || '').toLowerCase().replaceAll(' ', '-')}`}>{value || 'Unknown'}</span>; }
function Panel({ eyebrow, title, action, onAction, children, className = '' }) {
  return <article className={`panel admin-card ${className}`}><div className="panel-title"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <button className="text-button" onClick={onAction}>View all →</button>}</div>{children}</article>;
}

export default function AdminDashboard({ summary = {}, parking = [], bookings = [], reports = [], emergencyRequests = [], users = [], loading = false, error = '', onReload, onOpen }) {
  summary = summary || {};
  const activeReservations = Number(summary.activeParkingReservations ?? bookings.filter((item) => item.parkingLocationId && item.status === 'Confirmed').length);
  const pendingHazards = Number(summary.pendingHazardReports ?? reports.filter((item) => item.status === 'Pending').length);
  const pendingEmergencies = Number(summary.emergencyRequests ?? emergencyRequests.filter((item) => ['Pending', 'In Progress'].includes(item.status)).length);
  const metrics = [
    ['Total users', summary.totalUsers ?? summary.users ?? users.length, 'Registered accounts', 'orange', 'U'],
    ['Active parking reservations', activeReservations, 'Confirmed parking bookings', 'purple', 'P'],
    ['Pending hazard reports', pendingHazards, 'Reports awaiting review', 'green', '!'],
    ['Emergency requests', pendingEmergencies, 'Open response requests', 'orange', 'E'],
    ['Total bookings', summary.totalBookings ?? summary.bookings ?? bookings.length, 'All services', 'purple', 'B'],
    ['Available parking locations', summary.availableParkingLocations ?? parking.filter((item) => item.available > 0 && item.status === 'Open').length, 'Open locations', 'green', '⌖'],
  ];
  const activities = [
    ...bookings.map((item) => ({ key: `booking-${item.id}`, name: item.userEmail || 'Customer', text: `${item.service} · ${item.route}`, date: item.date, type: 'Booking' })),
    ...reports.map((item) => ({ key: `report-${item.id}`, name: item.userEmail || 'Traveler', text: `${item.type} · ${item.location}`, date: item.createdAt, type: 'Road report' })),
    ...emergencyRequests.map((item) => ({ key: `emergency-${item.id}`, name: item.userEmail || 'Traveler', text: `${item.type} · ${item.location}`, date: item.createdAt, type: 'Emergency' })),
    ...users.map((item) => ({ key: `user-${item.id}`, name: item.name, text: item.email, date: item.createdAt, type: 'New user' })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);
  const bars = parking.slice(0, 5);
  const parkingBookings = bookings.filter((item) => item.parkingLocationId || /parking/i.test(item.service));
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return <section className="admin-workspace dashboard-reference">
    {error && <div className="admin-dashboard-alert" role="alert">{error}<button onClick={onReload}>Retry</button></div>}
    {loading && <div className="admin-dashboard-loading" role="status">Refreshing live SmartMove data…</div>}
    <div className="admin-welcome"><div><span className="eyebrow">SMART TRANSPORT AUTOMATION</span><h2>{greeting}, Admin <span aria-label="Verified administrator">✓</span></h2><p>Monitor and manage SmartMove transport services.</p></div><div className="admin-live"><i/> Live database data <small>{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</small></div></div>
    <div className="admin-metrics">{metrics.map(([label, value, note, tone, icon]) => <article className={`admin-metric metric-${tone}`} key={label}><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span><strong>{Number(value).toLocaleString()}</strong><small>{note}</small></article>)}</div>
    <div className="admin-quick-actions"><b>Quick admin actions</b>{[['adminParking','Add parking location','+'],['adminHazards','Review hazard reports','!'],['users','Manage users','U'],['adminBookings','View bookings','B'],['adminEmergency','View emergency requests','E']].map(([page,label,icon])=><button key={page} onClick={()=>onOpen(page)}><span>{icon}</span>{label}<i>→</i></button>)}</div>
    <div className="admin-dashboard-grid">
      <Panel eyebrow="RESERVATIONS" title="Recent parking bookings" action="View all" onAction={()=>onOpen('adminBookings')}>
        {parkingBookings.length ? <div className="table-scroll"><table><thead><tr><th>Account</th><th>Location / service</th><th>Time</th><th>Status</th></tr></thead><tbody>{parkingBookings.slice(0,5).map((item)=><tr key={item.id}><td>{item.userEmail || 'Legacy record'}</td><td>{item.route || item.service}</td><td>{item.date ? new Date(item.date).toLocaleString() : '—'}</td><td><Status value={item.status}/></td></tr>)}</tbody></table></div> : <Empty>No parking bookings have been created.</Empty>}
      </Panel>
      <Panel eyebrow="ROAD SAFETY" title="Recent road hazard reports" action="View all" onAction={()=>onOpen('adminHazards')}>
        {reports.length ? <div className="table-scroll"><table><thead><tr><th>Location</th><th>Type</th><th>Reported</th><th>Status</th></tr></thead><tbody>{reports.slice(0,5).map((item)=><tr key={item.id}><td>{item.location}</td><td>{item.type}</td><td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td><td><Status value={item.status}/></td></tr>)}</tbody></table></div> : <Empty>No hazard reports have been submitted.</Empty>}
      </Panel>
      <Panel eyebrow="URGENT RESPONSE" title="Recent emergency requests" action="View all" onAction={()=>onOpen('adminEmergency')}>
        {emergencyRequests.length ? <div className="table-scroll"><table><thead><tr><th>Type</th><th>Location</th><th>Reported</th><th>Status</th></tr></thead><tbody>{emergencyRequests.slice(0,5).map((item)=><tr key={item.id}><td>{item.type}</td><td>{item.location}</td><td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td><td><Status value={item.status}/></td></tr>)}</tbody></table></div> : <Empty>No emergency requests have been received.</Empty>}
      </Panel>
      <Panel eyebrow="ACCOUNT UPDATES" title="Recent user activity" action="Manage users" onAction={()=>onOpen('users')}>
        {activities.length ? activities.map((item)=><div className="report-line" key={item.key}><span className="activity-dot"/><span><b>{item.name}</b><small>{item.text}</small></span><em>{item.type}</em></div>) : <Empty>No recent account or transport activity.</Empty>}
      </Panel>
      <Panel eyebrow="CAPACITY" title="Transport analytics" action="View analytics" onAction={()=>onOpen('adminTraffic')}>
        <div className="admin-analytics-summary"><div><small>Total bookings</small><b>{Number(summary.totalBookings ?? bookings.length).toLocaleString()}</b></div><div><small>Active vehicles</small><b>—</b></div><div><small>Parking occupancy</small><b>{parking.reduce((n,p)=>n+Number(p.total||0)-Number(p.available||0),0)} / {parking.reduce((n,p)=>n+Number(p.total||0),0)}</b></div></div>
        <div className="capacity-bars">{bars.map((item)=><div key={item.id}><span>{item.name}</span><i><b style={{width:`${item.total ? Math.max(3, Math.round((item.total-item.available)/item.total*100)) : 0}%`}}/></i><small>{item.total ? Math.round((item.total-item.available)/item.total*100) : 0}% occupied</small></div>)}</div>
      </Panel>
      <Panel eyebrow="CITY OPERATIONS" title="Live city / transport map" action="Open map" onAction={()=>onOpen('adminMap')} className="admin-map-panel">
        <iframe title="SmartMove city transport map" src="https://maps.google.com/maps?q=Hyderabad%20transport&t=&z=12&ie=UTF8&iwloc=&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><small>Map preview · transport overlays depend on connected city feeds.</small>
      </Panel>
    </div>
  </section>;
}
