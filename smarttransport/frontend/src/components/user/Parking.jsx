import React, { useMemo, useRef, useState } from 'react';

const DURATIONS = [1, 2, 3, 4, 6, 8, 12, 24];
const slotName = (index) => `${String.fromCharCode(65 + Math.floor(index / 10))}-${String(index % 10 + 1).padStart(2, '0')}`;
const rupees = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
const formatDateTime = (value) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const localDateTimeValue = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function Empty({ title, message }) { return <div className="empty-state"><b>{title}</b><p>{message}</p></div>; }

export default function Parking({ parking = [], bookings = [], onReserve, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [vehicle, setVehicle] = useState('Car');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [startTime, setStartTime] = useState(() => localDateTimeValue(new Date(Date.now() + 5 * 60 * 1000)));
  const startTimeInput = useRef(null);
  const [durationHours, setDurationHours] = useState(2);
  const [step, setStep] = useState('locations');
  const [booking, setBooking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const places = useMemo(() => parking.filter((place) => `${place.name} ${place.address}`.toLowerCase().includes(query.toLowerCase())), [parking, query]);
  const selectedPlace = parking.find((place) => place.id === selectedId);
  const hourlyPrice = Number(selectedPlace?.price || 0);
  const total = hourlyPrice * durationHours;
  const pendingCutoff = Date.now() - 15 * 60 * 1000;
  const taken = new Set(bookings.filter((item) => item.parkingLocationId != null && String(item.parkingLocationId) === String(selectedId).replace(/^p/, '') && (item.status === 'Confirmed' || (item.status === 'Pending Payment' && new Date(item.date).getTime() > pendingCutoff))).map((item) => item.parkingSlot).filter(Boolean));
  const slotCount = Math.min(Number(selectedPlace?.total || 0), 50);
  const slotNames = new Set(Array.from({ length: slotCount }, (_, index) => slotName(index)));
  taken.forEach((name) => slotNames.add(name));
  const displaySlots = [...slotNames].sort((left, right) => {
    const indexOf = (name) => {
      const [row, column] = name.split('-');
      const rowIndex = [...row].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
      return rowIndex * 10 + Number(column) - 1;
    };
    return indexOf(left) - indexOf(right);
  });

  async function beginPayment(event) {
    event.preventDefault(); setError(''); setBusy(true);
    if (new Date(startTime).getTime() < Date.now() - 60 * 1000) {
      setError('Choose a start date and time that has not passed.');
      setBusy(false);
      return;
    }
    const result = await onReserve({ ...selectedPlace, slot: selectedSlot, vehicle, vehicleNumber, ownerName, startTime, durationHours, totalPrice: total });
    setBusy(false);
    if (result?.error) { setError(result.error); return; }
    if (result) { setBooking(result); setStep('pass'); }
  }

  function reset() { setBooking(null); setSelectedId(''); setSelectedSlot(''); setVehicleNumber(''); setOwnerName(''); setStep('locations'); setError(''); }
  function openStartTimePicker() {
    const input = startTimeInput.current;
    if (!input) return;
    try { if (input.showPicker) input.showPicker(); else { input.focus(); input.click(); } }
    catch { input.focus(); input.click(); }
  }
  const startLabel = booking?.startTime ? formatDateTime(booking.startTime) : formatDateTime(startTime);

  return <section className="user-parking-page">
    <div className="user-page-intro"><div><span className="eyebrow">SMART PARKING</span><h2>{step === 'locations' || step === 'details' ? 'Find a place to park' : step === 'payment' ? 'Complete payment' : 'Your parking pass'}</h2><p>Reserve a space in a few simple steps. Payments are safely simulated for this demo.</p></div></div>

    {step === 'locations' && <>
      <section className="panel parking-search-panel"><label className="parking-search-label">Search parking locations<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mall, hospital, station, cinema, airport or area" /></label></section>
      {places.length ? <div className="parking-result-grid">{places.map((place) => {
      const available = Number(place.available) || 0;
        const closed = String(place.status).toLowerCase() === 'closed';
        const status = closed ? 'Closed' : available < 1 ? 'Full' : available <= Math.max(3, Math.ceil(Number(place.total || 0) * .15)) ? 'Limited' : 'Available';
        return <article className="panel parking-result" key={place.id}><div className="parking-result-heading"><span className="parking-result-icon">P</span><span className={`parking-status ${status.toLowerCase()}`}>{status}</span></div><span className="eyebrow">{place.category || 'Parking'}</span><h3>{place.name}</h3><p>{place.address}</p><div className="parking-facts"><span><small>Price / hour</small><b>{rupees(place.price)}</b></span><span><small>Available slots</small><b>{place.available} / {place.total}</b></span><span><small>Hours</small><b>{place.openingHours || '6:00 AM – 11:00 PM'}</b></span><span><small>Distance</small><b>{place.distance || 'Nearby'}</b></span></div><button className="button primary" disabled={status === 'Full' || status === 'Closed'} onClick={() => { setSelectedId(place.id); setSelectedSlot(''); setStartTime(localDateTimeValue(new Date(Date.now() + 5 * 60 * 1000))); setError(''); setStep('details'); }}>{status === 'Full' ? 'Fully booked' : 'Choose slot'}</button></article>;
      })}</div> : <Empty title="No matching parking locations" message="Try another search or category." />}
    </>}

    {step === 'details' && selectedPlace && <div className="parking-booking-layout">
      <section className="panel parking-slot-panel"><div className="panel-title"><div><span className="eyebrow">1 · CHOOSE YOUR SPACE</span><h2>{selectedPlace.name}</h2><p className="muted">{selectedPlace.address} · {selectedPlace.distance || 'Nearby'}</p></div><button className="text-button" type="button" onClick={() => setStep('locations')}>Change location</button></div><div className="parking-slot-legend"><span><i className="slot-key selected"/> Selected</span><span><i className="slot-key booked"/> Booked</span><span><i className="slot-key available"/> Available</span></div><div className="parking-slot-grid">{displaySlots.map((name) => { const booked = taken.has(name); return <button type="button" key={name} disabled={booked} aria-pressed={selectedSlot === name} className={`parking-slot ${booked ? 'booked' : ''} ${selectedSlot === name ? 'selected' : ''}`} onClick={() => { setSelectedSlot(name); setError(''); }}><span>{booked ? 'Booked' : selectedSlot === name ? 'Selected' : 'Available'}</span><b>{name}</b></button>; })}</div></section>
      <form className="panel parking-confirm-panel parking-details-form" onSubmit={beginPayment}><span className="eyebrow">2 · VEHICLE & TIME</span><h2>Booking details</h2><label>Vehicle type<select value={vehicle} onChange={(event) => setVehicle(event.target.value)}>{['Car', 'Bike', 'Auto', 'EV Car', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Vehicle number<input required minLength="5" maxLength="16" pattern="[A-Za-z0-9 -]{5,16}" title="Enter a valid vehicle registration number" value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value.toUpperCase())} placeholder="TS09AB1234" /></label><label>Vehicle owner<input required maxLength="120" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Enter owner name" /></label><label>Start date and time<div className="start-time-picker"><input ref={startTimeInput} type="datetime-local" required min={localDateTimeValue(new Date())} value={startTime} onChange={(event) => setStartTime(event.target.value)} /><button type="button" aria-label="Open date and time picker" title="Choose date and time" onClick={openStartTimePicker}>▣</button></div></label><label>Duration<select value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))}>{DURATIONS.map((hours) => <option key={hours} value={hours}>{hours} {hours === 1 ? 'hour' : 'hours'}</option>)}</select></label><dl className="parking-summary-list"><div><dt>Selected slot</dt><dd>{selectedSlot || 'Choose a space'}</dd></div><div><dt>Rate</dt><dd>{rupees(hourlyPrice)} / hour</dd></div></dl><div className="parking-total"><span>{rupees(hourlyPrice)} × {durationHours} hours</span><strong>{rupees(total)}</strong></div>{error && <p className="parking-flow-error" role="alert">{error}</p>}<button className="button primary parking-confirm-button" disabled={!selectedSlot || busy}>{busy ? 'Confirming reservation…' : 'Confirm reservation'}</button></form>
    </div>}

    {step === 'pass' && booking && <section className="panel parking-pass"><div className="parking-pass-head"><span>SMARTMOVE</span><small>PARKING PASS</small></div><div className="parking-pass-content"><span className="eyebrow">RESERVATION CONFIRMED</span><h2>{booking.service?.replace(/^Parking · /, '').split(' · Slot ')[0] || selectedPlace?.name}</h2><p>{booking.route}</p><div className="parking-reservation-id"><span>Reservation ID</span><strong>{booking.reservationId || `SM-${String(booking.id).padStart(6, '0')}`}</strong></div><div className="parking-pass-details"><span>Slot<b>{booking.parkingSlot}</b></span><span>Vehicle<b>{booking.vehicle}</b></span><span>Registration<b>{booking.vehicleNumber}</b></span><span>Start<b>{startLabel}</b></span><span>Duration<b>{booking.durationHours} hours</b></span><span>Amount<b>{rupees(booking.price)}</b></span></div><p className="parking-paid-mark">✓ Reservation confirmed</p></div><div className="parking-pass-actions"><button className="button primary" onClick={() => window.print()}>Print / download pass</button><button className="button outline" onClick={() => onOpen('dashboard')}>Back to dashboard</button></div></section>}
  </section>;
}

