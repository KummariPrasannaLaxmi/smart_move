import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './style.css';
import './auth.css';
import smartMoveCity from './assets/smartmove-city.svg';
import { api } from './services/api.js';
import AdminDashboard from './components/admin/AdminDashboard.jsx';
import ParkingManagement from './components/admin/ParkingManagement.jsx';
import BookingManagement from './components/admin/BookingManagement.jsx';
import HazardManagement from './components/admin/HazardManagement.jsx';
import UserManagement from './components/admin/UserManagement.jsx';
import Analytics from './components/admin/Analytics.jsx';
import EmergencyRequestManagement from './components/admin/EmergencyRequestManagement.jsx';
import Parking from './components/user/Parking.jsx';
import RoutePlanner from './components/user/RoutePlanner.jsx';
import ReportHazard from './components/user/ReportHazard.jsx';
import MyBookings from './components/user/MyBookings.jsx';

const FEATURES = [
  { id: 'parking', icon: 'P', title: 'Smart Parking Reservation', text: 'Check and reserve parking spaces online for cars, bikes and autos.' },
  { id: 'emergency', icon: 'E', title: 'Emergency Vehicle Priority', text: 'Preview emergency vehicle priority in a simulation.' },
  { id: 'hazards', icon: '!', title: 'Road Hazard Reporting', text: 'Report accidents, roadblocks or damaged roads and notify other travelers.' },
  { id: 'routes', icon: '↗', title: 'Eco-Friendly Route Suggestion', text: 'Plan a route with distance and travel time estimates.' },
  { id: 'analytics', icon: 'A', title: 'Transport Analytics Dashboard', text: 'View parking usage, hazard reports and available transport metrics.' },
];
const ROUTES = {
  about: '/about', features: '/features', contact: '/contact', register: '/register', login: '/login', adminLogin: '/admin/login',
  dashboard: '/dashboard', liveMap: '/map', rideBooking: '/ride-booking', parking: '/parking', bookings: '/parking/bookings', emergency: '/emergency', emergencyHistory: '/emergency/history',
  hazards: '/hazards', myReports: '/hazards/my-reports', traffic: '/traffic', trafficHistory: '/traffic/history', routes: '/routes', savedRoutes: '/routes/saved',
  notifications: '/notifications', profile: '/profile', settings: '/settings', analytics: '/analytics', admin: '/admin-dashboard', users: '/admin/users', adminParking: '/admin/parking', adminBookings: '/admin/bookings', adminHazards: '/admin/hazards', adminTraffic: '/admin/analytics', adminAnalytics: '/admin/analytics', adminEmergency: '/admin/emergency', adminMap: '/admin/map-monitoring', adminNotifications: '/admin/notifications', adminSettings: '/admin/settings',
};
function DashboardFeatureIcon({ id }) {
  if (id === 'parking') return <span aria-hidden="true">P</span>;
  if (id === 'hazards') return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 3h.01"/></svg>;
  if (id === 'emergency') return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 17h12l-1.3-2.2a4 4 0 0 1-.6-2.1V11a4.1 4.1 0 0 0-8.2 0v1.7a4 4 0 0 1-.6 2.1L6 17Z"/><path d="M10 20h4M12 2v2M4.9 5l1.4 1.4m11.4 0L19.1 5"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18M6 16v-4m5 4V8m5 8v-7m5 7V4"/><path d="m4 9 5-4 4 2 6-5"/></svg>;
}
function VehicleMapSymbol({ type, x, y }) {
  return <g transform={`translate(${x - 15} ${y - 15})`} aria-label={`${type} start location`}><circle cx="15" cy="15" r="15" fill="#3b82f6" stroke="white" strokeWidth="3"/>{type === 'Bike' ? <g fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="3.2"/><circle cx="22" cy="21" r="3.2"/><path d="m8 21 5-8 5 8H8l4-6h5m-5-2h3m4 0h2l4 8M11 10h2"/></g> : <text x="15" y="22" textAnchor="middle" fontSize="19">🚙</text>}</g>;
}
const PAGE_TITLES = { about: 'About SmartMove', features: 'Explore features', contact: 'Contact us', liveMap: 'Live Map', rideBooking: 'Book a ride', bookings: 'My Reservations', emergencyHistory: 'Simulation History', myReports: 'My Hazard Reports', traffic: 'Traffic Monitoring', trafficHistory: 'Traffic History', savedRoutes: 'Saved Routes', notifications: 'Notifications', profile: 'My Profile', settings: 'Settings', admin: 'Operations dashboard', users: 'User Management', adminParking: 'Parking Management', adminBookings: 'Reservation Management', adminHazards: 'Hazard Management', adminTraffic: 'Transport Analytics', adminEmergency: 'Emergency Simulation', adminMap: 'Map Monitoring', adminNotifications: 'Admin Notifications', adminSettings: 'Admin Profile & Settings', adminLogin: 'Admin Login' };
const pageFromPath = () => window.location.pathname === '/admin' ? 'admin' : Object.keys(ROUTES).find((key) => ROUTES[key] === window.location.pathname) || 'login';
const initialUser = () => { try { if (sessionStorage.getItem('sm-token')) return JSON.parse(sessionStorage.getItem('sm-user') || 'null'); if (localStorage.getItem('sm-token')) return JSON.parse(localStorage.getItem('sm-user') || 'null'); return null; } catch { return null; } };
const mapsUrl = (query) => `https://maps.google.com/maps?q=${encodeURIComponent(query || 'Hyderabad, India')}&z=13&output=embed`;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const FUEL_RATES = { Bike: 2.5, Auto: 3.2, Car: 8, Bus: 22 };
let googleMapsLoader;
function loadGoogleMaps() {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('Add VITE_GOOGLE_MAPS_API_KEY to frontend/.env.local to enable Google live routing.'));
  if (!googleMapsLoader) googleMapsLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&v=weekly&loading=async`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Google Maps could not load. Check the API key and enabled APIs.'));
    document.head.appendChild(script);
  });
  return googleMapsLoader;
}
async function findGoogleRoutes(start, destination, vehicle) {
  await loadGoogleMaps();
  const { Route } = await window.google.maps.importLibrary('routes');
  const roadVehicle = vehicle !== 'Bus';
  const request = {
    origin: start,
    destination,
    travelMode: vehicle === 'Bus' ? 'TRANSIT' : vehicle === 'Bike' ? 'TWO_WHEELER' : 'DRIVE',
    computeAlternativeRoutes: vehicle !== 'Bus',
    fields: roadVehicle
      ? ['path', 'distanceMeters', 'durationMillis', 'staticDurationMillis', 'routeLabels', 'travelAdvisory.fuelConsumptionMicroliters']
      : ['path', 'distanceMeters', 'durationMillis', 'routeLabels'],
  };
  if (roadVehicle) {
    request.routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
    request.extraComputations = ['FUEL_CONSUMPTION'];
    request.routeModifiers = { vehicleInfo: { emissionType: 'GASOLINE' } };
    request.requestedReferenceRoutes = ['FUEL_EFFICIENT'];
  }
  const { routes = [] } = await Route.computeRoutes(request);
  if (!routes.length) throw new Error('Google Maps could not find a route for those locations.');
  const liveRoutes = routes.map((item, index) => {
    const labels = item.routeLabels || [];
    const rawFuel = item.travelAdvisory?.fuelConsumptionMicroliters;
    const fuelLitres = rawFuel == null ? null : Number(rawFuel) / 1_000_000;
    const trafficRatio = item.staticDurationMillis ? item.durationMillis / item.staticDurationMillis : 1;
    const path = item.path || [];
    return {
      id: `google-${index + 1}`,
      name: labels.includes('FUEL_EFFICIENT') ? 'Google Maps fuel-efficient route' : index === 0 ? 'Google Maps recommended route' : `Google Maps alternative ${index}`,
      googleEcoRoute: labels.includes('FUEL_EFFICIENT'),
      distanceMeters: item.distanceMeters,
      durationSeconds: item.durationMillis / 1000,
      fuelLitres,
      geometry: path.map((point) => [typeof point.lng === 'function' ? point.lng() : point.lng, typeof point.lat === 'function' ? point.lat() : point.lat]),
      traffic: trafficRatio > 1.35 ? 'Heavy traffic' : trafficRatio > 1.12 ? 'Slow traffic' : 'Live traffic considered',
    };
  });
  return { start, destination, vehicle, source: 'google', routes: liveRoutes, attribution: 'Google Maps live routes' };
}
async function findOpenStreetMapRoutes(start, destination, vehicle) {
  async function geocode(query) {
    const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('The location lookup service could not be reached.');
    const result = await response.json();
    const coordinates = result.features?.[0]?.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) throw new Error(`Could not find “${query}”. Try a nearby street, landmark, or city.`);
    return { lon: Number(coordinates[0]), lat: Number(coordinates[1]) };
  }
  const [startPoint, endPoint] = await Promise.all([geocode(start), geocode(destination)]);
  const coordinates = `${startPoint.lon},${startPoint.lat};${endPoint.lon},${endPoint.lat}`;
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?alternatives=2&overview=full&geometries=geojson`, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('The road routing service could not be reached.');
  const result = await response.json();
  if (result.code !== 'Ok' || !result.routes?.length) throw new Error('No road route was found between those locations.');
  return {
    start, destination, vehicle, startPoint, endPoint, source: 'openstreetmap',
    routes: result.routes.map((item, index) => ({
      id: `osm-${index + 1}`,
      name: index === 0 ? 'Shortest road route' : `Alternative ${index}`,
      distanceMeters: item.distance,
      durationSeconds: item.duration,
      geometry: item.geometry?.coordinates || [],
    })),
    attribution: 'OpenStreetMap contributors · OSRM routing',
  };
}
function makeRouteOptions(rawRoutes, vehicle) {
  const rate = FUEL_RATES[vehicle] || FUEL_RATES.Car;
  const routes = rawRoutes.map((item, index) => {
    const distanceKm = item.distanceMeters / 1000;
    const fuelLitres = Number.isFinite(item.fuelLitres) ? item.fuelLitres : distanceKm * rate / 100;
    return { ...item, id: item.id || `sample-${index + 1}`, name: item.name || (index === 0 ? 'Recommended eco route' : `Alternative ${index}`), distanceKm, minutes: item.durationSeconds / 60, fuelLitres, fuelCost: fuelLitres * 110, emissionsKg: fuelLitres * 2.31, traffic: item.traffic || 'Traffic estimate unavailable' };
  });
  const minDistance = Math.min(...routes.map((item) => item.distanceKm));
  const minMinutes = Math.min(...routes.map((item) => item.minutes));
  const minFuel = Math.min(...routes.map((item) => item.fuelLitres));
  routes.forEach((item) => { item.ecoScore = Math.max(55, Math.min(100, 100 - Math.round(((item.distanceKm / minDistance - 1) * 30) + ((item.minutes / minMinutes - 1) * 25) + ((item.fuelLitres / minFuel - 1) * 25) + ((item.emissionsKg / Math.min(...routes.map((route) => route.emissionsKg)) - 1) * 20)))); });
  routes.sort((a, b) => Number(Boolean(b.googleEcoRoute)) - Number(Boolean(a.googleEcoRoute)) || b.ecoScore - a.ecoScore);
  routes[0].recommendation = true;
  return routes;
}
function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(initialUser);
  const page = Object.keys(ROUTES).find((key) => ROUTES[key] === location.pathname) || 'login';
  const setPage = (id) => navigate(ROUTES[id] || '/dashboard');
  const [authMode, setAuthMode] = useState(() => pageFromPath() === 'register' ? 'register' : 'login');
  const [signupRole, setSignupRole] = useState('USER');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('sm-remember') !== 'false');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [parking, setParking] = useState([]);
  const [dashboardQuery, setDashboardQuery] = useState('');
  const [liveMapQuery, setLiveMapQuery] = useState('Hyderabad, India');
  const [reports, setReports] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [emergency, setEmergency] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeVehicle, setRouteVehicle] = useState('Car');
  const [routeBusy, setRouteBusy] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rideFrom, setRideFrom] = useState('');
  const [rideTo, setRideTo] = useState('');
  const [rideType, setRideType] = useState('Mini');
  const [hazardType, setHazardType] = useState('Accident');
  const [hazardAlert, setHazardAlert] = useState('');

  const say = (text) => { setMessage(text); window.clearTimeout(say.timer); say.timer = window.setTimeout(() => setMessage(''), 3200); };
  const openSignup = () => {
    setAuthMode('register');
    setPage('register');
  };
  const loadData = async () => {
    const loadingAdmin = user?.role === 'ADMIN';
    if (loadingAdmin) { setDashboardLoading(true); setDashboardError(''); }
    try {
      const [spaces, stats, reportsData, bookingsData] = await Promise.all([api('/api/parking'), api('/api/summary'), api('/api/reports'), api('/api/bookings')]);
      // Notifications are an optional feed; older running API builds may not expose it yet.
      const notices = await api('/api/notifications').catch(() => []);
      setParking(spaces); setSummary(stats); setReports(reportsData); setBookings(bookingsData); setNotifications(notices);
      if (user?.role === 'ADMIN') {
        const [usersData, dashboardData, emergenciesData] = await Promise.all([api('/api/admin/users'), api('/api/admin/dashboard'), api('/api/emergency-requests')]);
        setDirectory(usersData); setSummary({ ...stats, totalUsers: dashboardData.totalUsers, activeParkingReservations: dashboardData.activeParkingReservations, pendingHazardReports: dashboardData.pendingHazardReports, emergencyRequests: dashboardData.emergencyRequests, totalBookings: dashboardData.totalBookings, availableParkingLocations: dashboardData.availableParkingLocations }); setEmergencyRequests(emergenciesData);
      } else setEmergencyRequests(await api('/api/emergency-requests').catch(() => []));
    } catch (error) {
      if (/sign in|unauthorized/i.test(error.message)) { localStorage.removeItem('sm-user'); localStorage.removeItem('sm-token'); sessionStorage.removeItem('sm-user'); sessionStorage.removeItem('sm-token'); setUser(null); setPage('login'); }
      if (loadingAdmin) setDashboardError(error.message || 'Dashboard data could not be loaded.');
      say(error.message);
    } finally { if (loadingAdmin) setDashboardLoading(false); }
  };
  useEffect(() => { if (user) loadData(); }, [user]);
  useEffect(() => {
    if (!user || !['myReports', 'emergency', 'notifications'].includes(page)) return;
    let active = true;
    const refreshUpdates = async () => {
      const [reportsResult, emergencyResult, noticesResult] = await Promise.allSettled([api('/api/reports'), api('/api/emergency-requests'), api('/api/notifications')]);
      if (!active) return;
      if (reportsResult.status === 'fulfilled') setReports(reportsResult.value);
      if (emergencyResult.status === 'fulfilled') setEmergencyRequests(emergencyResult.value);
      if (noticesResult.status === 'fulfilled') setNotifications(noticesResult.value);
    };
    refreshUpdates();
    const timer = window.setInterval(refreshUpdates, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user?.email, page]);
  useEffect(() => {
    const adminOnly = ['admin','adminParking','adminBookings','adminHazards','adminTraffic','adminAnalytics','adminEmergency','users','adminMap','adminNotifications','adminSettings'];
    const authPages = ['login','register','adminLogin'];
    if (!user && !authPages.includes(page)) navigate('/login', { replace: true });
    else if (user && ['login','register'].includes(page)) navigate(user.role === 'ADMIN' ? '/admin-dashboard' : '/dashboard', { replace: true });
    else if (user?.role === 'ADMIN' && page === 'adminLogin') navigate('/admin-dashboard', { replace: true });
    else if (user?.role !== 'ADMIN' && adminOnly.includes(page)) navigate('/dashboard', { replace: true });
    else if (user?.role === 'ADMIN' && ['parking','rideBooking','routes','hazards','myReports','bookings'].includes(page)) navigate('/admin', { replace: true });
  }, [user, page, navigate]);

  const open = (id) => { if (id === 'notifications' && user) { api('/api/notifications/read', { method: 'PATCH' }).then(() => setNotifications(items => items.map(item => ({ ...item, read: true })))).catch(() => {}); } if (!user && !['login','register','adminLogin'].includes(id)) { setAuthMode('login'); setPage('login'); return; } setFrom(''); setTo(''); setRoute(null); setEmergency(null); setPage(id); setMessage(''); };
  const logout = async () => { if (user?.role !== 'ADMIN' && !window.confirm('Log out of your SmartMove account?')) return; try { await api('/api/auth/logout', { method: 'POST' }); } catch {} localStorage.removeItem('sm-user'); localStorage.removeItem('sm-token'); sessionStorage.removeItem('sm-user'); sessionStorage.removeItem('sm-token'); setUser(null); setPage('login'); };
  const activeFeature = FEATURES.find((feature) => feature.id === page);
  const pageTitle = activeFeature?.title || PAGE_TITLES[page] || (page === 'dashboard' ? 'Dashboard' : 'Transportation Overview');
  const availableSpaces = useMemo(() => parking.reduce((sum, item) => sum + item.available, 0), [parking]);
  const reportCount = reports.length;

  async function submitAuth(event, mode = authMode) {
    event.preventDefault(); setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === 'login') { values.identifier = values.email; delete values.email; }
    else {
      if (values.password !== values.confirmPassword) { setBusy(false); say('Passwords do not match.'); return; }
      delete values.confirmPassword;
    }
    try {
      const result = await api(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify(values) });
      const savedUser = JSON.stringify(result.user);
      if (rememberMe) { localStorage.setItem('sm-user', savedUser); localStorage.setItem('sm-token', result.token); sessionStorage.removeItem('sm-user'); sessionStorage.removeItem('sm-token'); }
      else { sessionStorage.setItem('sm-user', savedUser); sessionStorage.setItem('sm-token', result.token); localStorage.removeItem('sm-user'); localStorage.removeItem('sm-token'); }
      localStorage.setItem('sm-remember', String(rememberMe)); setUser(result.user); setPage(result.user.role === 'ADMIN' ? 'admin' : 'dashboard'); say(`Welcome, ${result.user.name.split(' ')[0]}.`);
    } catch (error) { say(error.message); }
    finally { setBusy(false); }
  }
  async function reserve(space) {
    try { const booking = await api('/api/bookings', { method: 'POST', body: JSON.stringify({ service: `Parking · ${space.name} · Slot ${space.slot} · ${space.durationHours}h · ${space.vehicle}`, route: space.address, price: space.totalPrice, parkingId: space.id, slot: space.slot, vehicle: space.vehicle, vehicleNumber: space.vehicleNumber, ownerName: space.ownerName, startTime: space.startTime, durationHours: space.durationHours }) }); await loadData(); return booking; }
    catch (error) { say(error.message); return { error: error.message }; }
  }
  async function cancelReservation(booking) {
    try { await api(`/api/bookings/${booking.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Cancelled' }) }); say('Reservation cancelled.'); await loadData(); }
    catch (error) { say(error.message); }
  }
  async function deleteBooking(booking) {
    if (!window.confirm(`Delete booking #${booking.id}? This cannot be undone.`)) return;
    try { await api(`/api/bookings/${booking.id}`, { method: 'DELETE' }); say('Booking deleted.'); await loadData(); }
    catch (error) { say(error.message); }
  }
  async function saveProfile(event) {
    event.preventDefault(); setBusy(true);
    try {
      const updated = await api('/api/me', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      setUser(updated);
      const destination = localStorage.getItem('sm-remember') === 'false' ? sessionStorage : localStorage;
      destination.setItem('sm-user', JSON.stringify(updated));
      say('Profile updated.');
    } catch (error) { say(error.message); }
    finally { setBusy(false); }
  }
  async function bookRide(event) {
    event.preventDefault();
    const fare = ({ Mini: 180, Sedan: 260, Auto: 120 })[rideType];
    try {
      await api('/api/bookings', { method: 'POST', body: JSON.stringify({ service: `Ride · ${rideType}`, route: `${rideFrom.trim()} → ${rideTo.trim()}`, price: fare }) });
      say('Your ride request has been saved. SmartMove has no ride-provider connection, so no driver has been dispatched.'); setRideFrom(''); setRideTo(''); await loadData();
    } catch (error) { say(error.message); }
  }
  async function submitHazard(event) {
    event.preventDefault(); setBusy(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const values = Object.fromEntries(formData);
    const photo = formData.get('photo');
    try {
      delete values.photo;
      if (values.occurredAt) values.occurredAt = new Date(values.occurredAt).toISOString();
      if (photo instanceof File && photo.size > 3_500_000) throw new Error('Please choose an image smaller than 3.5 MB.');
      if (photo instanceof File && photo.size) values.photoData = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(photo); });
      const savedReport = await api('/api/reports', { method: 'POST', body: JSON.stringify(values) });
      const alerts = { Potholes: 'Pothole ahead. Drive carefully.', 'Road construction': 'Road work ahead. Follow signs and slow down.', Waterlogging: 'Waterlogged road ahead. Avoid the flooded area.', 'Broken traffic signals': 'Signal out ahead. Proceed with caution.', 'Fallen tree': 'Road obstruction ahead. Use another lane.', Accident: 'Accident ahead. Drive carefully.' };
      setHazardAlert(alerts[values.type] || 'Road hazard ahead. Drive carefully.');
      form.reset(); setHazardType('Accident'); say(`Hazard report submitted. ID: ${savedReport.id}.`); await loadData();
    }
    catch (error) { say(error.message); }
    finally { setBusy(false); }
  }
  function shareLocation(inputName) {
    if (!navigator.geolocation) return say('Location sharing is not available in this browser.');
    navigator.geolocation.getCurrentPosition(({ coords }) => { const field = document.querySelector(`[name="${inputName}"]`); if (field) { field.value = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`; field.dispatchEvent(new Event('input', { bubbles: true })); } }, () => say('Could not read your location. Check browser location permission.'), { enableHighAccuracy: true, timeout: 10000 });
  }
  function showCurrentLocationMap() {
    if (!navigator.geolocation) {
      setLiveMapQuery('Hyderabad, India');
      open('liveMap');
      say('Live location is unavailable in this browser. Showing the city map.');
      return;
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLiveMapQuery(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
      open('liveMap');
    }, () => {
      setLiveMapQuery('Hyderabad, India');
      open('liveMap');
      say('Could not access your location. Showing the city map.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }
  async function planRoute(event) {
    event.preventDefault();
    const start = from.trim();
    const destination = to.trim();
    if (!start || !destination) return say('Enter both a starting point and destination.');
    if (start.toLowerCase() === destination.toLowerCase()) return say('Choose two different locations.');
    setRouteBusy(true); setRoute(null); setSelectedRouteId('');
    try {
      let result;
      try {
        if (GOOGLE_MAPS_API_KEY) {
          result = await findGoogleRoutes(start, destination, routeVehicle);
        } else {
          result = await api('/api/routes', { method: 'POST', body: JSON.stringify({ start, destination, vehicle: routeVehicle }) });
          if (!result.routes?.length) throw new Error('The backend returned no routes.');
        }
      } catch (primaryError) {
        let backendError = primaryError;
        if (GOOGLE_MAPS_API_KEY) {
          try {
            result = await api('/api/routes', { method: 'POST', body: JSON.stringify({ start, destination, vehicle: routeVehicle }) });
            if (!result.routes?.length) throw new Error('The backend returned no routes.');
          } catch (error) { backendError = error; }
        }
        if (!result) {
          try {
            result = await findOpenStreetMapRoutes(start, destination, routeVehicle);
            say('Route calculated from OpenStreetMap road data. Travel time is an estimate and may not include live traffic.');
          } catch (fallbackError) {
            throw new Error(`Could not calculate this route. ${fallbackError.message} Backend: ${backendError.message}`);
          }
        }
      }
      const routes = makeRouteOptions(result.routes || [], routeVehicle).filter((item) => Number.isFinite(item.distanceKm) && Number.isFinite(item.minutes) && item.distanceKm > 0 && item.minutes > 0);
      if (!routes.length) throw new Error('The route service did not return valid distance and travel time.');
      setRoute({ ...result, vehicle: routeVehicle, routes });
      const shortest = routes.reduce((best, item) => item.distanceKm < best.distanceKm ? item : best, routes[0]);
      setSelectedRouteId(shortest.id);
    } catch (error) {
      say(error.message || 'Could not calculate this route. Please try again.');
    } finally {
      setRouteBusy(false);
    }
  }
  function simulateEmergency(event) { event.preventDefault(); if (!from.trim() || !to.trim()) return say('Enter the emergency vehicle location and destination.'); setEmergency({ from: from.trim(), to: to.trim(), type: new FormData(event.currentTarget).get('type') }); }

  if (!user || ['login','register','adminLogin'].includes(page)) return <main className={"auth-screen smartmove-auth " + (page === "register" ? "is-register" : "is-login")}>
    <section className="auth-info"><a className="brand brand-light" href="#top"><span className="brand-mark">&#10022;</span><span><b>SmartMove</b><small>Your journey<br/>Our priority</small></span></a><div className="auth-message"><span className="eyebrow">YOUR CITY, CONNECTED</span><h1>Make every<br/>journey count.</h1><p>Move through your city with confidence.</p><div className="auth-map auth-city"><img className="city-illustration" src={smartMoveCity} alt="" /></div></div></section>
    {page !== "register" && <section className="auth-login" id="login">
      <a className="brand brand-light" href="#top"><span className="brand-mark">&#10022;</span><span><b>SmartMove</b></span></a>
      <h2>{page === 'adminLogin' ? 'Admin Portal' : 'Welcome Back!'}</h2>
      <p>{page === 'adminLogin' ? 'Sign in to manage SmartMove operations' : 'Log in to access your account'}</p>
      <form onSubmit={(event)=>submitAuth(event,'login')} className="form-stack" autoComplete="off">
        <label className="auth-login-field"><span className="auth-field-label">Email Address</span><span className="auth-input-shell"><span aria-hidden="true">&#9993;</span><input name="email" type="email" autoComplete="off" required placeholder="Enter your email" /></span></label>
        <label className="auth-login-field"><span className="auth-field-label">Password</span><span className="auth-input-shell"><span aria-hidden="true">&#9818;</span><input name="password" type={showLoginPassword ? 'text' : 'password'} autoComplete="new-password" required minLength="6" placeholder="Enter your password" /><button className="password-toggle" type="button" aria-label={showLoginPassword ? 'Hide password' : 'Show password'} onClick={()=>setShowLoginPassword((shown)=>!shown)}>{showLoginPassword ? 'Hide' : 'Show'}</button></span></label>
        <input type="hidden" name="role" value={page === 'adminLogin' ? 'ADMIN' : 'USER'} />
        <div className="auth-options"><label><input type="checkbox" checked={rememberMe} onChange={(event)=>setRememberMe(event.target.checked)}/> Remember me</label><button type="button" onClick={()=>say('Password recovery is not configured yet. Please contact your SmartMove administrator.')}>Forgot password?</button></div>
        <button className="button primary" disabled={busy}>{busy ? 'Please wait?' : 'Login'}</button>
      </form>
      <div className="auth-create-account"><button type="button" className="button primary" onClick={openSignup}>Create Account</button><p>New to SmartMove? Join us today.</p></div>
      <div className="auth-role-switch"><span>{page === 'adminLogin' ? 'Using a user account?' : 'Managing SmartMove?'}</span><button type="button" onClick={() => setPage(page === 'adminLogin' ? 'login' : 'adminLogin')}>{page === 'adminLogin' ? 'User login' : 'Admin login'}</button></div>
    </section>}
    {page === "register" && <section className="auth-card" id="create-account"><span className="eyebrow">&#10022; &nbsp; CREATE ACCOUNT</span><h2>Create Account</h2><p className="muted">Join SmartMove and explore smarter transport</p><form onSubmit={(event)=>submitAuth(event,'register')} className="form-stack"><label>Full Name<input name="name" autoComplete="name" required maxLength="120" placeholder="Enter your name" /></label><label>Email Address<input name="email" type="email" autoComplete="email" required placeholder="Enter your email" /></label><label className="auth-role-field">Account type<select className="auth-role-select" name="role" value={signupRole} onChange={(event)=>setSignupRole(event.target.value)}><option value="USER">User</option><option value="ADMIN">Admin</option></select></label>{signupRole === 'ADMIN' && <label>Admin invite code<input name="adminCode" required autoComplete="off" placeholder="Enter the admin signup code" /></label>}<label>Password<input name="password" type={showRegisterPassword ? 'text' : 'password'} autoComplete="new-password" required minLength="6" placeholder="Create a password" /><button className="password-toggle" type="button" aria-label={showRegisterPassword ? 'Hide password' : 'Show password'} onClick={()=>setShowRegisterPassword((shown)=>!shown)}>{showRegisterPassword ? 'Hide' : 'Show'}</button></label><label>Confirm Password<input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required minLength="6" placeholder="Confirm your password" /><button className="password-toggle" type="button" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={()=>setShowConfirmPassword((shown)=>!shown)}>{showConfirmPassword ? 'Hide' : 'Show'}</button></label><button className="button primary" disabled={busy}>{busy ? 'Please wait…' : 'Sign Up'}</button></form><p className="auth-switch">Already have an account? <a href="#login" onClick={(event)=>{event.preventDefault();setAuthMode("login");setPage("login")}}>Login</a></p></section>}
    {message && <div className="toast">{message}</div>}
  </main>;

  const adminPages = [['admin','D','Dashboard'],['users','U','User Management'],['adminParking','P','Parking Management'],['adminHazards','!','Road Hazard Reports'],['adminEmergency','E','Emergency Requests'],['adminMap','M','Route Management'],['adminTraffic','A','Transport Analytics'],['adminBookings','B','Bookings Management'],['adminNotifications','R','Reports Management'],['adminSettings','S','Settings']];
  const isAdminPage = page === 'admin' || ['adminParking','adminBookings','adminHazards','adminTraffic','adminAnalytics','adminEmergency','users','adminMap','adminNotifications','adminSettings'].includes(page);
  return <div className={`app-shell ${isAdminPage ? 'admin-shell' : 'user-shell'} ${page === 'dashboard' ? 'dashboard-page' : ''} ${page === 'parking' ? 'parking-page-shell' : page === 'emergency' ? 'emergency-page-shell' : page === 'routes' ? 'route-page-shell' : ''}`}><aside className="sidebar"><a className="brand brand-light" href={isAdminPage ? '/admin' : '/dashboard'} onClick={(e)=>{e.preventDefault();setPage(isAdminPage ? 'admin' : 'dashboard')}}><span className="brand-mark">S</span><span><b>SmartMove</b><small>{isAdminPage ? 'Operations center' : 'Transport automation'}</small></span></a><div className="nav-caption">{isAdminPage ? 'MANAGEMENT' : 'YOUR JOURNEY'}</div><nav>{(isAdminPage ? adminPages : [['dashboard','D','Dashboard'],['parking','P','Smart Parking'],['hazards','!','Road Hazard Report'],['emergency','E','Emergency Priority'],['routes','R','Eco-Friendly Routes'],['analytics','A','Transport Analytics'],['bookings','B','My Bookings'],['myReports','!','My Reports']]).map(([id, icon, label]) => <button key={id} className={`nav-item ${page === id ? 'selected' : ''}`} onClick={() => open(id)}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-account"><button className={`nav-item ${page === 'profile' ? 'selected' : ''}`} onClick={()=>open(isAdminPage?'adminSettings':'profile')}><span>&#9881;</span>{isAdminPage?'Admin profile':'My Profile'}</button>{!isAdminPage && <button className={`nav-item ${page === 'settings' ? 'selected' : ''}`} onClick={()=>open('settings')}><span>S</span>Settings</button>}<button className="logout" onClick={logout}>Log out</button></div><div className="sidebar-user"><span className="user-dot">{user.name?.[0]?.toUpperCase()}</span><span><b>{user.name}</b><small>{user.role === 'ADMIN' ? 'Administrator' : user.email}</small></span></div></aside><main className="main"><header className="topbar"><div><span className="eyebrow">SMART TRANSPORT AUTOMATION</span><b>{pageTitle}</b></div><div className="topbar-right">{!isAdminPage && <button className="user-notification-button" aria-label="Open notifications" onClick={()=>open('notifications')}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>{notifications.some(item=>!item.read)&&<i>{notifications.filter(item=>!item.read).length}</i>}</button>}<span className="date-chip">{new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span><div className="top-user"><span>{user.name?.[0]?.toUpperCase()}</span>{user.name}</div></div></header><div className="content"><div className="page-heading"><div>{page === 'dashboard' ? <h1 className="dashboard-greeting">{`Good ${new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, ${user.name.split(' ')[0].toUpperCase()}`}</h1> : <><span className="eyebrow">SMART TRANSPORT AUTOMATION</span><h1>{pageTitle}</h1></>}<p>{page==='dashboard'?'Travel smart. Stay safe. Save time.':activeFeature?.text||'Your connected city mobility workspace.'}</p></div></div>
      {page === 'dashboard' && <><form className="dashboard-search-panel" onSubmit={event=>{event.preventDefault();open('parking');}}><span className="search-mark" aria-hidden="true">&#8982;</span><input value={dashboardQuery} onChange={event=>setDashboardQuery(event.target.value)} placeholder="Search malls, hospitals, cinemas, offices..." aria-label="Search parking locations"/><button type="button" className="location-action" onClick={showCurrentLocationMap}>Current location</button><button className="button primary">Search parking</button><button type="button" className="button route-search-action" onClick={()=>open('routes')}>Plan route</button></form><div className="user-quick-stats"><Stat icon="P" label="ACTIVE RESERVATIONS" value={bookings.filter(item=>item.status==='Confirmed').length}/><Stat icon="!" label="PENDING REPORTS" value={reports.filter(item=>item.status==='Pending').length}/><Stat icon="P" label="PARKING LOCATIONS" value={parking.length}/><Stat icon="R" label="AVAILABLE ROUTES" value={route?.routes?.length ?? '—'}/></div><section className="feature-grid dashboard-feature-grid">{['parking','hazards','emergency','routes'].map((id)=>{const feature=FEATURES.find((item)=>item.id===id)||{icon:'R',title:'Eco-Friendly Routes'};return <button className={`feature-card dashboard-feature dashboard-${id}`} key={id} onClick={()=>open(id)}><span className={`feature-icon quick-${id}`}><DashboardFeatureIcon id={id}/></span><b>{id==='routes'?'Eco-Friendly Routes':feature.title}</b><p>{id==='parking'?'Find and reserve parking spaces.':id==='hazards'?'Report potholes, accidents and roadblocks.':id==='emergency'?'Preview emergency vehicle priority.':'Plan a route for your journey.'}</p><span className="feature-link">{id==='hazards'?'Report now':'Explore'}   <span aria-hidden="true">&#8594;</span></span></button>})}</section><section className="dashboard-overview"><article className="panel dashboard-map-panel"><div className="panel-title"><div><span className="eyebrow">SMARTMOVE CITY</span><h2>Live map</h2></div><button className="text-button" onClick={()=>open('routes')}>Plan a route &#8594;</button></div><Map query="Hyderabad, India" /><p className="muted note">Map view powered by Google Maps. Live traffic overlays require a connected traffic data provider.</p></article><article className="panel dashboard-activity"><div className="panel-title"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>Recent bookings & reports</h2></div><button className="text-button" onClick={()=>open('bookings')}>View bookings &#8594;</button></div><span className="activity-section-label">Recent parking bookings</span>{bookings.length ? bookings.slice(0,2).map((item)=><div className="report-line" key={`booking-${item.id}`}><span className="booking-icon">P</span><span><b>{item.service}</b><small>{item.route}</small></span><em>{item.status}</em></div>) : <div className="empty">No parking bookings yet.</div>}<span className="activity-section-label">Road hazard reports</span>{reports.length ? reports.slice(0,3).map((item)=><div className="report-line" key={item.id}><span className="hazard-icon">!</span><span><b>{item.type}</b><small>{item.location}</small></span><em>{item.status}</em></div>) : <div className="empty">No hazard reports yet.</div>}<div className="dashboard-availability"><span><i/> Available parking spaces</span><b>{availableSpaces}</b></div></article></section></>}
      {page === 'liveMap' && <section className="panel live-map-page"><div className="panel-title"><div><span className="eyebrow">CITY MOBILITY</span><h2>Your location</h2></div><button className="button primary" onClick={()=>open('routes')}>Plan a route</button></div><Map query={liveMapQuery}/><p className="muted note">Map view powered by Google Maps. Live traffic overlays require a connected traffic data provider.</p></section>}
      {page === 'rideBooking' && <section className="ride-booking-page"><div className="ride-intro"><span className="eyebrow">SMARTMOVE RIDE</span><h2>Plan a city ride request</h2><p>Enter your trip details and save a fare estimate to your reservations. A ride provider is not connected, so this will not dispatch a driver.</p></div><form className="ride-form panel" onSubmit={bookRide}><div className="ride-locations"><label>Starting location<input value={rideFrom} onChange={e=>setRideFrom(e.target.value)} required placeholder="Enter starting location" /></label><span className="ride-connector" aria-hidden="true">&#8594;</span><label>Destination<input value={rideTo} onChange={e=>setRideTo(e.target.value)} required placeholder="Where are you going?" /></label></div><div className="ride-options"><button type="button" className="ride-option" data-selected={rideType === 'Mini'} onClick={()=>setRideType('Mini')}><span>&#128663;</span><b>Mini</b><small>Affordable · 4 seats</small><strong>&#8377;180</strong></button><button type="button" className="ride-option" data-selected={rideType === 'Sedan'} onClick={()=>setRideType('Sedan')}><span>&#128664;</span><b>Prime Sedan</b><small>Comfortable · 4 seats</small><strong>&#8377;260</strong></button><button type="button" className="ride-option" data-selected={rideType === 'Auto'} onClick={()=>setRideType('Auto')}><span>&#128762;</span><b>Auto</b><small>Quick city trip · 3 seats</small><strong>&#8377;120</strong></button></div><div className="ride-submit"><p>Estimated fare · <b>&#8377;{({Mini:180,Sedan:260,Auto:120})[rideType]}</b><small> Final fare may vary by distance and traffic.</small></p><button className="button primary">Save ride request</button></div></form><div className="ride-trust"><span>◆ Upfront fare estimate</span><span>◆ Convenient city pickup</span><span>◆ Request saved to My Reservations</span></div></section>}
      {['about','features','contact','savedRoutes','emergencyHistory','trafficHistory','traffic'].includes(page) && <section className="panel"><div className="panel-title"><div><span className="eyebrow">SMARTMOVE CITY MOBILITY</span><h2>{pageTitle}</h2></div></div>{page==='traffic'?<><p className="muted">Current transport overview from available SmartMove records.</p><div className="stats-grid"><Stat label="Parking spaces available" value={summary?.parking ?? '--'}/><Stat label="Reservations" value={summary?.bookings ?? bookings.length}/><Stat label="Hazard reports" value={summary?.reports ?? reports.length}/><Stat label="Traffic status" value={summary?.traffic ?? 'Unavailable'}/></div><p className="demo-note">Traffic data is not connected.</p></>:page==='savedRoutes'?<EmptyState title="No saved routes" message="Plan a route to view directions. Route saving is not yet connected to the backend."/>:page==='emergencyHistory'?<EmptyState title="No simulation history" message="Emergency priority runs are educational previews and are not persisted."/>:page==='trafficHistory'?<EmptyState title="No traffic history" message="Historical sensor data requires a traffic data provider."/>:<><p className="muted">SmartMove brings parking, route planning and road safety tools together for a more connected city journey.</p><div className="public-feature-grid"><article className="public-feature-card"><span>P</span><h3>Smart parking</h3><p>Find locations and save a reservation.</p><button className="text-button" onClick={()=>open('parking')}>Find parking</button></article><article className="public-feature-card"><span>R</span><h3>Route planning</h3><p>Compare mapped road route options.</p><button className="text-button" onClick={()=>open('routes')}>Plan a route</button></article><article className="public-feature-card"><span>!</span><h3>Road safety</h3><p>Submit hazards and track report status.</p><button className="text-button" onClick={()=>open('hazards')}>Report hazard</button></article></div></>}</section>}
      {page === 'bookings' && <MyBookings bookings={bookings} onCancel={cancelReservation} onDelete={deleteBooking} onOpen={open} />}
      {page === 'myReports' && <section className="panel table-panel"><div className="panel-title"><div><span className="eyebrow">ROAD SAFETY</span><h2>My hazard reports</h2></div><button className="button primary" onClick={()=>open('hazards')}>Report a hazard</button></div>{reports.length ? <div className="table-scroll"><table><thead><tr><th>Type</th><th>Location</th><th>Description</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead><tbody>{reports.map((item)=><tr key={item.id}><td>{item.type}</td><td>{item.location}</td><td>{item.description}</td><td>{new Date(item.occurredAt || item.createdAt).toLocaleString()}</td><td><span className="status-pill">{item.status}</span></td><td><button className="text-button danger" onClick={async()=>{if(!window.confirm('Delete this hazard report? This cannot be undone.'))return;try{await api(`/api/reports/${item.id}`,{method:'DELETE'});say('Hazard report deleted.');await loadData();}catch(error){say(error.message);}}}>Delete</button></td></tr>)}</tbody></table></div> : <EmptyState title="No hazard reports" message="Reports you submit will be listed here with their review status."/>}</section>}
      {page === 'notifications' && <NotificationsPage items={notifications} onDelete={async (item) => { try { await api(`/api/notifications/${item.id}`, { method: 'DELETE' }); setNotifications(items => items.filter(notice => notice.id !== item.id)); } catch (error) { say(error.message); } }} />}
      {page === 'profile' && <ProfilePage user={user} busy={busy} onSave={saveProfile} onOpen={open} />}
      {page === 'settings' && <SettingsPage user={user} busy={busy} onSave={saveProfile} />}
      {page === 'adminSettings' && <SettingsPage user={user} busy={busy} onSave={saveProfile} admin />}
      {page === 'adminMap' && <section className="panel"><div className="panel-title"><div><span className="eyebrow">OPERATIONS MAP</span><h2>Map monitoring</h2></div><span className="demo-tag">GOOGLE MAP EMBED</span></div><Map query="Hyderabad transport and road hazards"/><p className="muted">SmartMove currently has no connected live sensor or traffic overlay feed.</p></section>}
      {page === 'adminNotifications' && <NotificationsPage items={notifications} admin />}
      {page === 'parking' && <Parking parking={parking} bookings={bookings} onReserve={reserve} initialQuery={dashboardQuery} />}
      {page === 'emergency' && <><UserEmergencyRequestForm requests={emergencyRequests} onReload={loadData} onNotify={say} onCurrentLocation={() => shareLocation('location')}/><UserEmergencySimulationPanel onNotify={say}/></>}
      {page === 'hazards' && <ReportHazard hazardType={hazardType} setHazardType={setHazardType} busy={busy} onSubmit={submitHazard} onShareLocation={shareLocation} alert={hazardAlert} onOpen={open} />}
      {page === 'routes' && <RoutePlanner from={from} setFrom={setFrom} to={to} setTo={setTo} vehicle={routeVehicle} setVehicle={(mode) => { setRouteVehicle(mode); setRoute(null); setSelectedRouteId(''); }} busy={routeBusy} onSubmit={planRoute} route={route} selectedRouteId={selectedRouteId} onSelectRoute={setSelectedRouteId} mapPanel={route?.source === 'google' ? <GoogleLiveRouteMap plan={route} selectedRouteId={selectedRouteId} onSelectRoute={setSelectedRouteId} /> : route?.startPoint && route?.endPoint ? <RouteMap plan={route} selectedRouteId={selectedRouteId} hazards={reports} /> : <GoogleEmbedRouteMap plan={route} start={from} destination={to} selectedRouteId={selectedRouteId} />} onNotify={say} />}
      {page === 'analytics' && <><div className="stats-grid analytics-stats"><Stat icon="P" label="SPACES AVAILABLE" value={summary?.parking ?? '--'} /><Stat icon="P" label="TOTAL CAPACITY" value={summary?.parkingTotal ?? '--'} /><Stat icon="!" label="ALL HAZARD REPORTS" value={summary?.reports ?? reportCount} /><Stat icon="!" label="PENDING REPORTS" value={summary?.hazards ?? '--'} /></div><div className="dashboard-bottom"><section className="panel"><div className="panel-title"><div><span className="eyebrow">PARKING USAGE</span><h2>Space availability by location</h2></div></div>{parking.map((space) => <div className="usage-row" key={space.id}><span><b>{space.name}</b><small>{space.available} available of {space.total}</small></span><div className="usage-track"><i style={{ width: `${space.total ? Math.round((space.available / space.total) * 100) : 0}%` }} /></div><b>{space.total ? Math.round((space.available / space.total) * 100) : 0}%</b></div>)}</section><section className="panel"><div className="panel-title"><div><span className="eyebrow">TRAFFIC CONDITIONS</span><h2>City status</h2></div><span className="status-pill">{summary?.traffic || 'Unavailable'}</span></div><Map query="Traffic in Hyderabad" /><p className="muted note">Traffic data is a demo status until connected to a live traffic data provider.</p></section></div></>}
      {isAdminPage && page === 'admin' && <AdminDashboard summary={summary} parking={parking} bookings={bookings} reports={reports} emergencyRequests={emergencyRequests} users={directory} loading={dashboardLoading} error={dashboardError} onReload={loadData} onOpen={open} />}
      {isAdminPage && page === 'adminParking' && <ParkingManagement parking={parking} onReload={loadData} onNotify={say} />}
      {isAdminPage && page === 'adminBookings' && <BookingManagement bookings={bookings} onReload={loadData} onNotify={say} />}
      {isAdminPage && page === 'adminHazards' && <HazardManagement reports={reports} onReload={loadData} onNotify={say} />}
      {isAdminPage && page === 'users' && <UserManagement users={directory} currentEmail={user.email} onReload={loadData} onNotify={say} />}
      {isAdminPage && ['adminTraffic','adminAnalytics'].includes(page) && <Analytics summary={summary} parking={parking} bookings={bookings} reports={reports} />}
      {isAdminPage && page === 'adminEmergency' && <EmergencyRequestManagement requests={emergencyRequests} onReload={loadData} onNotify={say} />}
    {message && <div className="toast">{message}</div>}</div></main></div>;
}

function GoogleEmbedRouteMap({ plan, start, destination, selectedRouteId }) {
  const origin = plan?.start || start;
  const target = plan?.destination || destination;
  const selected = plan?.routes?.find((item) => item.id === selectedRouteId) || plan?.routes?.[0];
  const routeUrl = origin && target
    ? `https://www.google.com/maps?output=embed&saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(target)}`
    : mapsUrl(target || origin || 'Hyderabad, India');
  return <section className="route-map-panel google-embed-route-panel">
    <div className="route-map-title"><b>GOOGLE MAPS ROUTE</b><span>{origin && target ? `${origin} → ${target}` : origin || target || 'Explore nearby streets and places'}</span><span className="google-live-pill">Route preview</span></div>
    <div className="map-frame"><iframe title={`Google Maps route: ${origin} to ${target}`} src={routeUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/>{selected && <div className="route-map-selected-metrics"><b>{selected.name}</b><span>{selected.distanceKm.toFixed(1)} km · {formatRouteDuration(selected.minutes)}</span></div>}</div>
    {selected && <p className="google-embed-note">Selected route: {selected.distanceKm.toFixed(1)} km · {formatRouteDuration(selected.minutes)}. Select Start navigation to open directions.</p>}
  </section>;
}

function formatRouteDuration(minutes) {
  const totalMinutes = Math.ceil(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return hours ? `${hours} hr ${remainingMinutes} min` : `${totalMinutes} min`;
}

function GoogleLiveRouteMap({ plan, selectedRouteId, onSelectRoute }) {
  const mapElement = useRef(null);
  const [mapError, setMapError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let map;
    const polylines = [];
    const markers = [];
    async function drawGoogleMap() {
      try {
        await loadGoogleMaps();
        const [{ Map, Polyline }, { AdvancedMarkerElement }] = await Promise.all([
          window.google.maps.importLibrary('maps'),
          window.google.maps.importLibrary('marker'),
        ]);
        if (cancelled || !mapElement.current) return;
        const firstPoint = plan.routes.find((item) => item.geometry?.length)?.geometry[0];
        if (!firstPoint) throw new Error('Google Maps returned no route geometry.');
        map = new Map(mapElement.current, {
          center: { lat: firstPoint[1], lng: firstPoint[0] },
          zoom: 12,
          mapId: 'DEMO_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          keyboardShortcuts: false,
        });
        const bounds = new window.google.maps.LatLngBounds();
        for (const routeOption of plan.routes) {
          const path = (routeOption.geometry || []).map(([lng, lat]) => ({ lat, lng }));
          if (path.length < 2) continue;
          path.forEach((point) => bounds.extend(point));
          const line = new Polyline({
            map,
            path,
            geodesic: true,
            strokeColor: routeOption.recommendation ? '#16A34A' : '#1677FF',
            strokeOpacity: routeOption.id === selectedRouteId ? 1 : 0.68,
            strokeWeight: routeOption.id === selectedRouteId ? 8 : 5,
            zIndex: routeOption.id === selectedRouteId ? 3 : 1,
          });
          line.addListener('click', () => onSelectRoute(routeOption.id));
          polylines.push(line);
        }
        const start = plan.routes[0].geometry[0];
        const firstRoute = plan.routes[0].geometry;
        const last = firstRoute[firstRoute.length - 1];
        const startMarker = { map, position: { lat: start[1], lng: start[0] }, title: `Start: ${plan.start}` };
        if (plan.vehicle === 'Bike' || plan.vehicle === 'Auto') {
          const bikeIcon = document.createElement('div');
          bikeIcon.className = 'google-vehicle-map-marker';
          bikeIcon.textContent = plan.vehicle === 'Bike' ? '\u{1F6B2}' : '\u{1F6FA}';
          startMarker.content = bikeIcon;
        }
        markers.push(new AdvancedMarkerElement(startMarker));
        markers.push(new AdvancedMarkerElement({ map, position: { lat: last[1], lng: last[0] }, title: `Destination: ${plan.destination}` }));
        map.fitBounds(bounds, 48);
        if (!cancelled) setMapError('');
      } catch (error) {
        if (!cancelled) setMapError(error.message || 'Google Maps could not display this route.');
      }
    }
    drawGoogleMap();
    return () => {
      cancelled = true;
      polylines.forEach((line) => line.setMap(null));
      markers.forEach((marker) => { marker.map = null; });
      if (map) window.google?.maps?.event?.clearInstanceListeners(map);
    };
  }, [plan, selectedRouteId, onSelectRoute]);
  const selected = plan.routes.find((item) => item.id === selectedRouteId) || plan.routes[0];
  return <section className="route-map-panel google-route-panel"><div className="route-map-title"><b>GOOGLE LIVE ROUTE MAP</b><span>{plan.start} &#8594; {plan.destination}</span><span className="google-live-pill">{plan.vehicle === 'Bus' ? 'Live transit' : 'Live traffic'}</span></div><div className="google-live-map" ref={mapElement} role="application" aria-label="Google map with live route alternatives"/>{selected && <div className="route-map-selected-metrics"><b>{selected.name}</b><span>{selected.distanceKm.toFixed(1)} km · {formatRouteDuration(selected.minutes)}</span></div>}{mapError && <div className="google-map-error">{mapError}</div>}<div className="route-map-legend"><span><i className="route-line-eco"/> Recommended eco route</span><span><i className="route-line-alt"/> Alternative routes</span><span className="traffic-unavailable">Google Maps traffic-aware routing</span></div></section>;
}

function SampleRouteMap({ plan, selectedRouteId }) {
  const samplePaths = ['M 110 245 C 225 230, 275 170, 390 180 S 585 110, 790 90', 'M 110 245 C 225 200, 260 275, 390 230 S 590 195, 790 90', 'M 110 245 C 230 290, 305 110, 430 145 S 625 210, 790 90'];
  return <section className="route-map-panel"><div className="route-map-title"><b>SAMPLE ROUTE PREVIEW</b><span>{plan.start} &#8594; {plan.destination}</span></div><svg className="route-map-svg sample-route-svg" viewBox="0 0 920 365" role="img" aria-label="Illustrative sample routes between the entered locations"><rect width="920" height="365" fill="#eef5ef"/><path d="M0 75H920 M0 145H920 M0 215H920 M0 285H920 M95 0V365 M220 0V365 M350 0V365 M480 0V365 M610 0V365 M740 0V365 M860 0V365" stroke="#fff" strokeWidth="13"/><path d="M0 75H920 M0 145H920 M0 215H920 M0 285H920 M95 0V365 M220 0V365 M350 0V365 M480 0V365 M610 0V365 M740 0V365 M860 0V365" stroke="#d6e1df" strokeWidth="2" strokeDasharray="5 7"/>{plan.routes.map((item,index)=><path key={item.id} d={samplePaths[index % samplePaths.length]} fill="none" stroke={item.recommendation?'#16A34A':'#1677FF'} strokeWidth={item.id===selectedRouteId?8:5} strokeLinecap="round" opacity={item.id===selectedRouteId?1:.72}/>)}<circle cx="110" cy="245" r="12" fill="#1677FF" stroke="white" strokeWidth="4"/><circle cx="790" cy="90" r="12" fill="#16A34A" stroke="white" strokeWidth="4"/><rect x="70" y="267" width="230" height="32" rx="8" fill="white"/><text x="82" y="288" fontSize="12" fill="#102A43">Start: {plan.start.slice(0,32)}</text><rect x="615" y="35" width="250" height="32" rx="8" fill="white"/><text x="627" y="56" fontSize="12" fill="#102A43">Destination: {plan.destination.slice(0,32)}</text></svg><div className="route-map-legend"><span><i className="route-line-eco"/> Recommended eco route</span><span><i className="route-line-alt"/> Alternative routes</span><span className="traffic-unavailable">Illustrative only - live map unavailable</span></div></section>;
}

function RouteMap({ plan, selectedRouteId, hazards }) {
  const width = 920, height = 365;
  const coords = plan.routes.flatMap((item) => item.geometry).concat([[plan.startPoint.lon, plan.startPoint.lat], [plan.endPoint.lon, plan.endPoint.lat]]);
  const mercator = ([lon, lat], zoom = 0) => {
    const size = 256 * Math.pow(2, zoom);
    const limitedLat = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180;
    return [(lon + 180) / 360 * size, (1 - Math.log(Math.tan(limitedLat) + 1 / Math.cos(limitedLat)) / Math.PI) / 2 * size];
  };
  const base = coords.map((point) => mercator(point));
  const minX = Math.min(...base.map((point) => point[0])), maxX = Math.max(...base.map((point) => point[0]));
  const minY = Math.min(...base.map((point) => point[1])), maxY = Math.max(...base.map((point) => point[1]));
  const zoom = Math.max(3, Math.min(18, Math.floor(Math.log2(Math.min((width - 90) / Math.max(maxX - minX, .002), (height - 70) / Math.max(maxY - minY, .002))))));
  const tileCount = Math.pow(2, zoom);
  const projected = coords.map((point) => mercator(point, zoom));
  const centerX = (Math.min(...projected.map((point) => point[0])) + Math.max(...projected.map((point) => point[0]))) / 2;
  const centerY = (Math.min(...projected.map((point) => point[1])) + Math.max(...projected.map((point) => point[1]))) / 2;
  const baseZoom = (point) => mercator(point, zoom);
  const screen = (point) => { const value = baseZoom(point); return [(value[0] - centerX) + width / 2, (value[1] - centerY) + height / 2]; };
  const xStart = Math.floor((centerX - width / 2) / 256), xEnd = Math.floor((centerX + width / 2) / 256);
  const yStart = Math.max(0, Math.floor((centerY - height / 2) / 256)), yEnd = Math.min(tileCount - 1, Math.floor((centerY + height / 2) / 256));
  const tiles = [];
  for (let x = xStart; x <= xEnd; x++) for (let y = yStart; y <= yEnd; y++) {
    const tileX = ((x % tileCount) + tileCount) % tileCount;
    tiles.push({ key: `${x}-${y}`, url: `https://tile.openstreetmap.org/${zoom}/${tileX}/${y}.png`, x: x * 256 - centerX + width / 2, y: y * 256 - centerY + height / 2 });
  }
  const hazardPoints = hazards.flatMap((report) => {
    const match = String(report.location || '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!match) return [];
    const point = screen([Number(match[2]), Number(match[1])]);
    return point[0] >= 0 && point[0] <= width && point[1] >= 0 && point[1] <= height ? [{ report, point }] : [];
  });
  return <section className="route-map-panel"><div className="route-map-title"><b>ROUTE MAP</b><span>{plan.start} &#8594; {plan.destination}</span></div><svg className="route-map-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Map showing recommended and alternative routes"><rect width={width} height={height} fill="#e9f1e8"/>{tiles.map((tile)=><image key={tile.key} href={tile.url} x={tile.x} y={tile.y} width="256" height="256"/>)}{plan.routes.map((item, index) => <polyline key={item.id} points={item.geometry.map((point)=>screen(point).join(',')).join(' ')} fill="none" stroke={item.recommendation?'#18a76f':'#4085ea'} strokeWidth={selectedRouteId===item.id?7:4} strokeLinecap="round" strokeLinejoin="round" opacity={selectedRouteId===item.id?1:.78}><title>{item.name}: {item.distanceKm?.toFixed(1)} km</title></polyline>)}{hazardPoints.map(({report,point})=><g key={report.id}><circle cx={point[0]} cy={point[1]} r="10" fill="#ef5a53" stroke="white" strokeWidth="3"/><text x={point[0]} y={point[1]+4} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">!</text></g>)}{[[plan.startPoint,'A','#1377e8'],[plan.endPoint,'B','#dc4c53']].map(([point,label,color])=>{const [x,y]=screen([point.lon,point.lat]);return <g key={label}><circle cx={x} cy={y} r="10" fill={color} stroke="white" strokeWidth="3"/><text x={x} y={y+4} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">{label}</text></g>;})}{['Bike','Auto'].includes(plan.vehicle) && <VehicleMapSymbol type={plan.vehicle} x={screen([plan.startPoint.lon, plan.startPoint.lat])[0]} y={screen([plan.startPoint.lon, plan.startPoint.lat])[1]}/>}</svg><div className="route-map-legend"><span><i className="route-line-eco"/> Eco route</span><span><i className="route-line-alt"/> Alternative</span><span><i className="route-marker-hazard">!</i> Reported hazard with GPS</span><span className="traffic-unavailable">Live traffic unavailable</span></div><div className="map-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Report a map issue</a></div></section>;
}

function UserEmergencyRequestForm({ requests = [], onReload, onNotify, onCurrentLocation }) {
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try { await api('/api/emergency-requests', { method: 'POST', body: JSON.stringify({ type: form.get('type'), location: form.get('location'), description: form.get('description') }) }); formElement.reset(); await onReload(); onNotify('Emergency request sent to SmartMove operations.'); }
    catch (error) { onNotify(error.message); }
    finally { setSaving(false); }
  };
  return <section className="panel emergency-request-form"><span className="eyebrow">REQUEST ASSISTANCE</span><h2>Send an emergency request</h2><p className="muted">For urgent situations, contact local emergency services directly. This request is sent to SmartMove administrators.</p><form className="form-stack" onSubmit={submit}><label>Request type<select name="type"><option>Medical</option><option>Accident</option><option>Road obstruction</option><option>Vehicle breakdown</option><option>Other</option></select></label><div className="emergency-location-field"><label htmlFor="emergency-request-location">Location</label><div className="emergency-location-input"><input id="emergency-request-location" name="location" required maxLength="240" placeholder="Street, landmark or area"/><button className="text-button" type="button" onClick={onCurrentLocation}>Use current location</button></div></div><label>Details<textarea name="description" required maxLength="2000" rows="3" placeholder="Describe the assistance needed"/></label><button className="button primary" disabled={saving}>{saving?'Sending…':'Send request'}</button></form><div className="emergency-user-updates"><div className="panel-title"><div><span className="eyebrow">YOUR REQUESTS</span><h2>Operations updates</h2></div><span className="status-pill">{requests.length}</span></div>{requests.length ? requests.map((item) => <article className="emergency-user-update" key={item.id}><div><b>{item.type} request · {item.location}</b><p>{item.description}</p><small>Submitted {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'recently'}</small></div><span className={`status-pill status-${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span></article>) : <p className="muted">Your submitted requests and status updates will appear here.</p>}</div></section>;
}

function EmergencyVehicleGraphic({ type }) {
  const styles = {
    Ambulance: { body: '#f8fbff', stripe: '#ef4444', label: 'EMS' },
    'Fire truck': { body: '#e84142', stripe: '#ffc247', label: 'FIRE' },
    Police: { body: '#f8fbff', stripe: '#2563eb', label: 'POLICE' },
  };
  const style = styles[type] || styles.Ambulance;
  return <svg className={`emergency-vehicle-graphic vehicle-${type.toLowerCase().replaceAll(' ', '-')}`} viewBox="0 0 84 46" role="img" aria-label={type}>
    <path d="M8 13Q8 9 12 9h39l12 10h8q5 0 5 5v10H8z" fill={style.body} stroke="#1b3549" strokeWidth="2"/>
    <path d="M52 12v10h16L57 12z" fill="#9ddcf3" stroke="#1b3549" strokeWidth="1.5"/>
    <path d="M10 27h64v6H10z" fill={style.stripe}/>
    {type === 'Ambulance' && <g fill="white"><rect x="27" y="16" width="4" height="15" rx="1"/><rect x="21.5" y="21.5" width="15" height="4" rx="1"/></g>}
    {type === 'Fire truck' && <g fill="none" stroke="#fff4cf" strokeWidth="2"><path d="M17 8h29M20 5h29M24 2h29"/><path d="m23 8 6-6m8 6 6-6m8 6 6-6"/></g>}
    {type === 'Police' && <path d="m32 15 2 4 4 .6-3 3 .7 4-3.7-2-3.7 2 .7-4-3-3 4-.6z" fill="white"/>}
    <rect x="30" y="4" width="17" height="4" rx="2" fill="#1c3850"/><rect className="emergency-beacon-light" x="31" y="4.5" width="7.5" height="3" rx="1.5" fill="#3b82f6"/><rect className="emergency-beacon-light" x="38.5" y="4.5" width="7.5" height="3" rx="1.5" fill="#fb4e59"/>
    <circle cx="23" cy="35" r="6" fill="#182d3c"/><circle cx="23" cy="35" r="2.5" fill="#d7e6ef"/><circle cx="64" cy="35" r="6" fill="#182d3c"/><circle cx="64" cy="35" r="2.5" fill="#d7e6ef"/>
    <text x="42" y="26" textAnchor="middle" fontSize="5" fontWeight="800" fill={type === 'Fire truck' ? '#fff' : '#243b52'}>{style.label}</text>
  </svg>;
}

function UserEmergencySimulationPanel({ onNotify }) {
  const [vehicle,setVehicle]=useState('Ambulance');
  const [direction,setDirection]=useState('Northbound');
  const [origin,setOrigin]=useState('');
  const [active,setActive]=useState(false);
  function useCurrentLocation() {
    if (!navigator.geolocation) return onNotify('Location sharing is not available in this browser.');
    navigator.geolocation.getCurrentPosition(({ coords }) => { setOrigin(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`); onNotify('Current location added as the simulation starting point.'); }, () => onNotify('Could not read your location. Check browser location permission.'), { enableHighAccuracy: true, timeout: 10000 });
  }
  return <section className="user-simulation-page"><div className="user-page-intro"><div><span className="eyebrow">EMERGENCY PRIORITY</span><h2>Signal priority simulation</h2><p>See how a selected approach could receive priority at an intersection.</p></div></div><div className="simulation-layout"><section className="panel"><div className="intersection-scene" data-active={active}><div className="intersection-road road-horizontal"/><div className="intersection-road road-vertical"/><div className="intersection-crossing"/><div className={`intersection-vehicle ${direction.toLowerCase()}`} data-active={active}><EmergencyVehicleGraphic type={vehicle}/></div><div className={`intersection-signal ${active?'priority':''}`}><i/><i/><i/></div><span className="intersection-north">N</span></div><div className="simulation-caption"><b>{active?`${vehicle} has simulated priority`: 'Normal intersection state'}</b><span>{active?`${direction} approach enabled for this simulation.`:'Start the simulation to preview the priority state.'}</span></div></section><section className="panel simulation-controls"><span className="eyebrow">SIMULATION CONTROLS</span><h3>Configure response</h3><label>Emergency vehicle<select value={vehicle} onChange={event=>setVehicle(event.target.value)}><option>Ambulance</option><option>Fire truck</option><option>Police</option></select></label><div className="emergency-location-field"><label htmlFor="emergency-simulation-origin">Starting location</label><div className="emergency-location-input"><input id="emergency-simulation-origin" value={origin} onChange={event=>setOrigin(event.target.value)} placeholder="Starting location"/><button className="text-button" type="button" onClick={useCurrentLocation}>Use current location</button></div></div><label>Approach direction<select value={direction} onChange={event=>setDirection(event.target.value)}><option>Northbound</option><option>Southbound</option><option>Eastbound</option><option>Westbound</option></select></label><div className="simulation-actions"><button className="button primary" onClick={()=>setActive(true)}>Start Simulation</button><button className="button outline" onClick={()=>setActive(false)}>Reset</button></div></section></div></section>;
}

function EmptyState({ title, message }) { return <div className="empty-state"><span>&#9825;</span><b>{title}</b><p>{message}</p></div>; }
function Stat({ icon, label, value }) { return <article className="stat-card"><span className="stat-icon">{icon}</span><span><small>{label}</small><b>{value}</b></span></article>; }
function Map({ query }) { return <div className="map-frame"><iframe title={`Google Maps: ${query}`} src={mapsUrl(query)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div>; }

export default App;





function NotificationsPage({ items, admin = false, onDelete }) {
  return <section className="panel"><div className="panel-title"><div><span className="eyebrow">{admin?'OPERATIONS UPDATES':'ACCOUNT UPDATES'}</span><h2>{admin?'Admin notifications':'Notifications'}</h2></div><span className="status-pill">{items.length} updates</span></div>{items.length ? <div className="notification-list">{items.map(item=><article className={`notification-item ${item.read?'is-read':'is-unread'}`} key={item.id}><span className="notification-dot"/><div><b>{item.title}</b><p>{item.detail}</p><small>{item.date?new Date(item.date).toLocaleString():'Recent'}</small></div>{onDelete&&<button className="text-button danger notification-delete" onClick={()=>onDelete(item)} aria-label={`Delete notification: ${item.title}`}>Delete</button>}</article>)}</div> : <EmptyState title="You are all caught up" message="Admin status updates will appear here."/>}</section>;
}

function ProfilePage({ user, busy, onSave, onOpen }) {
  return <section className="panel profile-panel"><div className="panel-title"><div><span className="eyebrow">ACCOUNT DETAILS</span><h2>My profile</h2><p className="muted">Update the details used for your SmartMove account.</p></div><span className="profile-avatar">{user.name?.[0]?.toUpperCase()}</span></div><form className="form-stack profile-form" onSubmit={onSave}><label>Full name<input name="name" defaultValue={user.name} required maxLength="120"/></label><label>Email address<input name="email" type="email" defaultValue={user.email} required maxLength="190"/></label><label>Phone number<input name="phone" type="tel" defaultValue={user.phone||''} minLength="7" maxLength="24" placeholder="Optional"/></label><label>Account role<input value={user.role==='ADMIN'?'Administrator':'User'} readOnly/></label><button className="button primary" disabled={busy}>{busy?'Saving?':'Save profile'}</button></form>{user.role!=='ADMIN'&&onOpen&&<div className="profile-actions"><button className="button outline" type="button" onClick={()=>onOpen('settings')}>Account preferences</button><p className="muted">Change password is not available because the current authentication API does not provide that operation.</p></div>}</section>;
}

function SettingsPage({ user, busy, onSave, admin = false }) {
  const key=`sm-preferences-${user.email}`;
  const [preferences,setPreferences]=useState(()=>{try{return JSON.parse(localStorage.getItem(key)||'{"emailUpdates":true,"compactMaps":false}')}catch{return {emailUpdates:true,compactMaps:false}}});
  const update=(name,value)=>{const next={...preferences,[name]:value};setPreferences(next);localStorage.setItem(key,JSON.stringify(next));};
  return <div className="settings-layout"><ProfilePage user={user} busy={busy} onSave={onSave}/><section className="panel"><span className="eyebrow">PERSONAL PREFERENCES</span><h2>{admin?'Admin':'User'} settings</h2><label className="preference-row"><span><b>Account activity updates</b><small>Show updates created from your SmartMove reservations and reports.</small></span><input type="checkbox" checked={preferences.emailUpdates} onChange={e=>update('emailUpdates',e.target.checked)}/></label><label className="preference-row"><span><b>Compact map panels</b><small>Use a more compact map preview in dashboards.</small></span><input type="checkbox" checked={preferences.compactMaps} onChange={e=>update('compactMaps',e.target.checked)}/></label><p className="demo-note">Preferences are saved in this browser. Notification delivery and live traffic overlays are not connected.</p></section></div>;
}

function EmergencySimulationPanel() {
  const [active,setActive]=useState(null);
  const [vehicle,setVehicle]=useState('Ambulance');
  const [origin,setOrigin]=useState('');
  const [destination,setDestination]=useState('');
  return <div className="admin-columns"><section className="panel"><span className="eyebrow">EDUCATIONAL SIMULATION</span><h2>Emergency vehicle priority</h2><p className="muted">Demonstrate a priority corridor. This interface does not operate real traffic signals.</p><form className="form-stack" onSubmit={e=>{e.preventDefault();setActive({vehicle,origin,destination,time:new Date().toLocaleTimeString()});}}><label>Vehicle<select value={vehicle} onChange={e=>setVehicle(e.target.value)}><option>Ambulance</option><option>Fire truck</option><option>Police</option></select></label><label>Starting location<input value={origin} onChange={e=>setOrigin(e.target.value)} required placeholder="Starting location"/></label><label>Destination<input value={destination} onChange={e=>setDestination(e.target.value)} required placeholder="Hospital or destination"/></label><button className="button primary">Run simulation</button></form>{active&&<div className="simulation-status"><b>Simulation preview ? {active.vehicle}</b><span>{active.origin} ? {active.destination}</span><small>Created locally at {active.time}. No signal or emergency-service system was contacted.</small></div>}</section><section className="panel"><span className="eyebrow">ROUTE CONTEXT</span><h2>City map preview</h2><Map query={active?`${active.origin} to ${active.destination}`:'Emergency services Hyderabad'}/></section></div>;
}
