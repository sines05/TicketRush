import axios from 'axios';

// Standard Response Format expectation (backend):
// { success: boolean, message?: string, data?: any, errors?: any }

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  withCredentials: true
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

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
    const originalRequest = error.config;

    // Handle 401 Unauthorized for silent refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid infinite loops if refresh or login fails
      if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise(function (resolve, reject) {
        api
          .post('/auth/refresh')
          .then(() => {
            processQueue(null);
            resolve(api(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            // If refresh fails, notify the app to handle logout/redirect
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
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
