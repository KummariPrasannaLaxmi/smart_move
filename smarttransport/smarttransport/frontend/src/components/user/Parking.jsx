import React, { useMemo, useState } from 'react';

function Empty({ title, message }) {
  return <div className="empty-state"><b>{title}</b><p>{message}</p></div>;
}

function slotName(index) {
  let rowNumber = Math.floor(index / 10) + 1;
  let rowName = '';
  while (rowNumber > 0) {
    rowName = String.fromCharCode(65 + (rowNumber - 1) % 26) + rowName;
    rowNumber = Math.floor((rowNumber - 1) / 26);
  }
  return `${rowName}-${String(index % 10 + 1).padStart(2, '0')}`;
}

export default function Parking({ parking = [], bookings = [], onReserve, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [vehicle, setVehicle] = useState('Car');
  const [durationHours, setDurationHours] = useState(2);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const places = useMemo(() => parking.filter((place) => `${place.name} ${place.address}`.toLowerCase().includes(query.toLowerCase())), [parking, query]);
  const selectedPlace = places.find((place) => place.id === selectedId);
  const hourlyPrice = selectedPlace ? Number(selectedPlace.price || 0) : 0;
  const estimatedTotal = hourlyPrice * durationHours;
  const totalSlots = Math.max(0, Number(selectedPlace?.total || 0));
  const visibleSlotCount = Math.min(totalSlots, 40);
  const occupiedCount = Math.max(0, totalSlots - Number(selectedPlace?.available || 0));
  const activeBookings = bookings.filter((booking) => booking.status === 'Confirmed' && String(booking.parkingLocationId) === String(selectedPlace?.id).replace(/^p/, ''));
  const bookedSlotSet = new Set(activeBookings.map((booking) => booking.service?.match(/Slot ([A-Z]+-\d+)/)?.[1]).filter(Boolean));
  for (let index = 0; bookedSlotSet.size < occupiedCount && index < totalSlots; index += 1) bookedSlotSet.add(slotName(index));
  const firstVisibleSlot = Math.max(0, Math.min(totalSlots - visibleSlotCount, occupiedCount - 5));
  const slots = Array.from({ length: visibleSlotCount }, (_, index) => {
    const number = firstVisibleSlot + index;
    const name = slotName(number);
    return { name, booked: bookedSlotSet.has(name) };
  });

  async function confirmReservation() {
    if (!selectedPlace || !selectedSlot) return;
    setConfirming(true);
    const booking = await onReserve({ ...selectedPlace, slot: selectedSlot, vehicle, durationHours, totalPrice: estimatedTotal });
    if (booking) setConfirmedBooking({ ...booking, slot: selectedSlot, vehicle, durationHours, location: selectedPlace.name, amount: estimatedTotal });
    setConfirming(false);
  }

  return <section className="user-parking-page">
    <div className="user-page-intro"><div><span className="eyebrow">SMART PARKING</span><h2>Find a place to park</h2><p>Search parking locations, choose an open slot and confirm your reservation.</p></div></div>

    <section className="panel parking-search-panel"><div className="parking-search-controls"><label>Search parking<input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId(''); setSelectedSlot(''); setConfirmedBooking(null); }} placeholder="Mall, hospital, street or area"/></label></div></section>

    {places.length ? <div className="parking-result-grid">{places.map((place) => {
      const available = Number(place.available) || 0;
      const isClosed = String(place.status).toLowerCase() === 'closed';
      const status = isClosed ? 'Closed' : available < 1 ? 'Full' : available <= Math.max(3, Math.ceil(Number(place.total || 0) * 0.15)) ? 'Limited' : 'Available';
      return <article className={`panel parking-result ${selectedId === place.id ? 'is-selected' : ''}`} key={place.id}>
        <div className="parking-result-heading"><span className="parking-result-icon">P</span><span className={`parking-status ${status.toLowerCase()}`}>{status}</span></div>
        <span className="eyebrow">PARKING LOCATION</span><h3>{place.name}</h3><p>{place.address}</p>
        <div className="parking-facts"><span><small>Price / hour</small><b>â‚¹{place.price}</b></span><span><small>Available slots</small><b>{place.available} / {place.total}</b></span></div>
        <button className={`button ${selectedId === place.id ? 'primary' : 'outline'}`} disabled={status === 'Full' || status === 'Closed'} onClick={() => { setSelectedId(selectedId === place.id ? '' : place.id); setSelectedSlot(''); setConfirmedBooking(null); }}>{selectedId === place.id ? 'Selected' : 'Choose a slot'}</button>
      </article>;
    })}</div> : <Empty title={query || kind !== 'All places' ? 'No matching parking locations' : 'Parking inventory unavailable'} message={query || kind !== 'All places' ? 'Try another search or location type.' : 'Parking records will appear here when available.'}/>}

    {selectedPlace && !confirmedBooking && <div className="parking-booking-layout">
      <section className="panel parking-slot-panel"><div className="panel-title"><div><span className="eyebrow">BOOK YOUR SLOT</span><h2>{selectedPlace.name}</h2><p className="muted">Select an open parking slot. Availability reflects the live location count.</p></div></div>
        <div className="parking-slot-legend"><span><i className="slot-key selected"/> Your selection</span><span><i className="slot-key booked"/> Booked</span><span><i className="slot-key available"/> Available</span></div>
        <div className="parking-slot-grid">{slots.map((slot) => <button type="button" key={slot.name} disabled={slot.booked} aria-pressed={selectedSlot === slot.name} className={`parking-slot ${slot.booked ? 'booked' : ''} ${selectedSlot === slot.name ? 'selected' : ''}`} onClick={() => setSelectedSlot(slot.name)}><span>{slot.booked ? 'Booked' : 'Open'}</span><b>{slot.name}</b></button>)}</div>
      </section>
      <section className="panel parking-confirm-panel"><div className="panel-title"><div><span className="eyebrow">BOOKING SUMMARY</span><h2>Confirm your parking</h2></div></div>
        <dl className="parking-summary-list"><div><dt>Location</dt><dd>{selectedPlace.name}</dd></div><div><dt>Slot</dt><dd>{selectedSlot || 'Select a slot'}</dd></div><div><dt>Vehicle</dt><dd><select aria-label="Vehicle" value={vehicle} onChange={(event) => setVehicle(event.target.value)}><option>Car</option><option>Bike</option><option>Auto</option></select></dd></div><div><dt>Duration</dt><dd><select aria-label="Duration" value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))}>{[1, 2, 3, 4, 6, 8].map((hours) => <option value={hours} key={hours}>{hours} {hours === 1 ? 'hour' : 'hours'}</option>)}</select></dd></div><div><dt>Rate</dt><dd>â‚¹{hourlyPrice} / hour</dd></div></dl>
        <div className="parking-total"><span>Estimated total</span><strong>â‚¹{estimatedTotal}</strong></div>
        <button className="button primary parking-confirm-button" disabled={!selectedSlot || confirming || Number(selectedPlace.available) < 1 || String(selectedPlace.status).toLowerCase() === 'closed'} onClick={confirmReservation}>{confirming ? 'Confirmingâ€¦' : 'Confirm reservation'}</button>
      </section>
    </div>}

    {confirmedBooking && <section className="panel parking-success-panel"><div className="parking-success-mark" aria-hidden="true">âœ“</div><div><span className="eyebrow">RESERVATION CONFIRMED</span><h2>Your parking is booked</h2><p>{confirmedBooking.location} Â· Slot {confirmedBooking.slot} Â· {confirmedBooking.durationHours} {confirmedBooking.durationHours === 1 ? 'hour' : 'hours'}</p><div className="parking-reservation-id"><span>Reservation ID</span><strong>SM-{String(confirmedBooking.id).padStart(6, '0')}</strong></div></div><div className="parking-success-total"><span>Reservation total</span><strong>â‚¹{confirmedBooking.amount}</strong><button className="text-button" onClick={() => { setConfirmedBooking(null); setSelectedSlot(''); }}>Book another slot</button></div></section>}
  </section>;
}
