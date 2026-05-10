import axios from 'axios';

// Standard Response Format expectation (backend):
// { success: boolean, message?: string, data?: any, errors?: any }

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tr_access_token') || localStorage.getItem('tr_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const payload = response?.data;

    // If backend already returns standard format, keep it.
    if (payload && typeof payload === 'object' && 'success' in payload) return payload;

    // Otherwise wrap.
    return { success: true, data: payload, message: '', errorCode: '' };
  },
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('tr_access_token');
      localStorage.removeItem('tr_token');
      // Redirect to login if not already there to prevent redirect loops
      if (!window.location.pathname.startsWith('/auth/login')) {
        window.location.href = '/auth/login';
      }
    }

    const payload = error?.response?.data;
    if (payload && typeof payload === 'object' && 'success' in payload) {
      return Promise.reject(payload);
    }

    return Promise.reject({
      success: false,
      data: null,
      message: error?.message || 'Network error',
      errorCode: 'NETWORK_ERROR'
    });
  }
);

export function unwrap(response) {
  if (!response) throw { success: false, data: null, message: 'Empty response', errorCode: 'EMPTY_RESPONSE' };
  if (response.success) return response.data;
  throw response;
}
