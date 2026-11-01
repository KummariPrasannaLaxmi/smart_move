const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function getToken() {
  try {
    return sessionStorage.getItem('sm-token') || localStorage.getItem('sm-token') || '';
  } catch {
    return '';
  }
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const responseText = await response.text();
  let result = {};
  try { result = responseText ? JSON.parse(responseText) : {}; } catch {}
  if (!response.ok) {
    const serverMessage = result.error || result.message || result.detail;
    const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    throw new Error(serverMessage || `Request failed (${status}) at ${path}.`);
  }
  return result;
}

export const API_BASE = API_BASE_URL || '(same origin; Vite proxies /api to Spring Boot)';
