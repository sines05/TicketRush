import axios from 'axios';

// Standard Response Format expectation (backend):
// { success: boolean, message?: string, data?: any, errors?: any }

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  timeout: 15000,
  withCredentials: true
});

api.interceptors.request.use((config) => {
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
