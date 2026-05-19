import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

async function login({ email, password }) {
  const res = await api.post(API_ROUTES.AUTH_LOGIN, { email, password });
  return unwrap(res);
}

async function register({ email, password, full_name, gender, date_of_birth }) {
  const res = await api.post(API_ROUTES.AUTH_REGISTER, {
    email,
    password,
    full_name,
    gender,
    date_of_birth
  });
  return unwrap(res);
}

async function logout() {
  const res = await api.post(API_ROUTES.AUTH_LOGOUT);
  return unwrap(res);
}

async function forgotPassword({ email }) {
  const res = await api.post(API_ROUTES.AUTH_FORGOT_PASSWORD, { email });
  return unwrap(res);
}

async function resetPassword({ token, new_password }) {
  const res = await api.post(API_ROUTES.AUTH_RESET_PASSWORD, { token, new_password });
  return unwrap(res);
}

async function socialLogin(provider) {
  const publicApiUrl = import.meta.env.VITE_PUBLIC_API_URL || '';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  const route = API_ROUTES[`AUTH_${provider.toUpperCase()}_LOGIN`];

  let targetUrl;
  if (apiBaseUrl.startsWith('http')) {
    targetUrl = `${apiBaseUrl}${route}`;
  } else {
    const base = publicApiUrl || window.location.origin.replace(/\/$/, '');
    targetUrl = `${base}${apiBaseUrl}${route}`;
  }

  // Clean up potential double slashes except after protocol
  targetUrl = targetUrl.replace(/([^:]\/)\/+/g, '$1');

  window.location.href = targetUrl;
}

async function setup2FA() {
  const res = await api.post(API_ROUTES.AUTH_SETUP_2FA);
  return unwrap(res);
}

async function enable2FA(code) {
  const res = await api.post(API_ROUTES.AUTH_ENABLE_2FA, { code });
  return unwrap(res);
}

async function verify2FALogin(pending_token, code) {
  const res = await api.post(API_ROUTES.AUTH_VERIFY_2FA, { pending_token, code });
  return unwrap(res);
}

async function disable2FA(code) {
  const res = await api.post(API_ROUTES.AUTH_DISABLE_2FA, { code });
  return unwrap(res);
}

export default { login, register, logout, forgotPassword, resetPassword, socialLogin, setup2FA, enable2FA, verify2FALogin, disable2FA };
