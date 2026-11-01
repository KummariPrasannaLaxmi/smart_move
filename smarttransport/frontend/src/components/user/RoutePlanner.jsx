import React, { useMemo } from 'react';

const transportModes = ['Car', 'Bike', 'Auto'];

export default function RoutePlanner({ from, setFrom, to, setTo, vehicle, setVehicle, busy, onSubmit, route, selectedRouteId, onSelectRoute, mapPanel }) {
  const options = route?.routes || [];
  const selected = useMemo(() => options.find((item) => item.id === selectedRouteId) || options[0], [options, selectedRouteId]);
  const navigationUrl = selected && route
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(route.start)}&destination=${encodeURIComponent(route.destination)}&travelmode=${vehicle === 'Bike' ? 'bicycling' : vehicle === 'Bus' ? 'transit' : 'driving'}`
    : '';

  return <div className="user-route-page">
    <section className="panel route-search-panel">
      <div className="eco-search-heading"><div><span className="eyebrow">ROUTE PLANNER</span><h2>Compare route options</h2><p className="muted">Enter a starting point and destination to view mapped alternatives.</p></div></div>
      <form className="route-planner-form" onSubmit={onSubmit}>
        <label>Starting location<input value={from} onChange={(event) => setFrom(event.target.value)} placeholder="Starting location" required maxLength="240" /></label>
        <span className="route-direction-mark" aria-hidden="true">→</span>
        <label>Destination<input value={to} onChange={(event) => setTo(event.target.value)} placeholder="Destination" required maxLength="240" /></label>
        <button className="button primary route-submit" disabled={busy}>{busy ? 'Finding routes…' : 'Compare routes'}</button>
      </form>
      <div className="transport-mode-picker" role="group" aria-label="Transport mode">{transportModes.map((mode) => <button key={mode} type="button" className={vehicle === mode ? 'selected' : ''} aria-pressed={vehicle === mode} onClick={() => setVehicle(mode)}>{mode}</button>)}</div>
      <p className="route-provider-note">Route options are compared for the selected transport mode. Public transport and live traffic estimates depend on provider coverage.</p>
    </section>
    {route && <section className="route-comparison-grid">
      <div className="route-map-column">{mapPanel}</div>
      <div className="panel route-comparison-panel">
        <div className="panel-title"><div><span className="eyebrow">{route.start} → {route.destination}</span><h2>Available options</h2></div></div>
        {options.length ? <div className="route-option-list">{options.map((option) => <button type="button" key={option.id} className={`route-option-card ${selected?.id === option.id ? 'selected' : ''}`} onClick={() => onSelectRoute(option.id)}>
          <span><b>{option.name}</b></span>
          <strong>{Number(option.distanceKm).toFixed(1)} km</strong>
        </button>)}</div> : <p className="empty">No route alternatives were returned.</p>}
        {selected && <a className="eco-navigation-button route-navigation-button" href={navigationUrl} target="_blank" rel="noreferrer">Start navigation · {Number(selected.distanceKm).toFixed(1)} km</a>}
        <p className="route-provider-note">The connected route service may not provide mode-specific transit data.</p>
      </div>
    </section>}
    {!route && <div className="route-map-column route-map-empty">{mapPanel}</div>}
  </div>;
}
