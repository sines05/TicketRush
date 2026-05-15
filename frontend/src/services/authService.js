import { ROLES } from '../constants/roles.js';
import { GENDER } from '../constants/gender.js';
import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const resetTokensByEmail = new Map();

function makeToken(email) {
  return `mock.${btoa(unescape(encodeURIComponent(email)))}.${Date.now()}`;
}

async function login({ email, password }) {
  if (!USE_MOCK) {
    const res = await api.post(API_ROUTES.AUTH_LOGIN, { email, password });
    return unwrap(res);
  }

  await sleep(450);

  if (!email || !password) {
    throw { success: false, message: 'Vui lòng nhập email và mật khẩu' };
  }

  const role = email.toLowerCase().includes('admin') ? ROLES.ADMIN : ROLES.CUSTOMER;

  return {
    id: role === ROLES.ADMIN ? 'uuid-admin-01' : 'uuid-customer-01',
    user_id: role === ROLES.ADMIN ? 'uuid-admin-01' : 'uuid-customer-01',
    email: email,
    full_name: role === ROLES.ADMIN ? 'Admin Demo' : 'Customer Demo',
    role,
    two_factor_enabled: false,
    is_oauth: false
  };
}

async function register({ email, password, full_name, gender, date_of_birth }) {
  if (!USE_MOCK) {
    const res = await api.post(API_ROUTES.AUTH_REGISTER, {
      email,
      password,
      full_name,
      gender,
      date_of_birth
    });
    return unwrap(res);
  }

  await sleep(550);

  if (!email || !password) {
    throw { success: false, message: 'Vui lòng nhập email và mật khẩu' };
  }

  if (!full_name) {
    throw { success: false, message: 'Vui lòng nhập họ tên' };
  }

  if (![GENDER.MALE, GENDER.FEMALE, GENDER.OTHER].includes(gender)) {
    throw { success: false, message: 'Vui lòng chọn giới tính hợp lệ' };
  }

  if (!date_of_birth) {
    throw { success: false, message: 'Vui lòng chọn ngày sinh' };
  }

  const id = `uuid-${Math.random().toString(16).slice(2)}`;
  return {
    id: id,
    user_id: id,
    email,
    full_name,
    role: ROLES.CUSTOMER,
    gender,
    date_of_birth,
    two_factor_enabled: false,
    is_oauth: false
  };
}

async function logout() {
  if (!USE_MOCK) {
    const res = await api.post(API_ROUTES.AUTH_LOGOUT);
    return unwrap(res);
  }
  await sleep(300);
  return { success: true };
}

async function forgotPassword({ email }) {
  if (!USE_MOCK) {
    const res = await api.post(API_ROUTES.AUTH_FORGOT_PASSWORD, { email });
    return unwrap(res);
  }

  await sleep(450);

  if (!email) {
    throw { success: false, message: 'Vui lòng nhập email' };
  }

  const reset_token = `mock-reset-${Math.random().toString(16).slice(2)}${Date.now()}`;
  const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  resetTokensByEmail.set(String(email).toLowerCase(), { reset_token, expires_at });

  return { sent: true, reset_token, expires_at };
}

async function resetPassword({ reset_token, new_password }) {
  if (!USE_MOCK) {
    const res = await api.post(API_ROUTES.AUTH_RESET_PASSWORD, { reset_token, new_password });
    return unwrap(res);
  }

  await sleep(450);

  if (!reset_token || !new_password) {
    throw { success: false, message: 'Thiếu reset_token hoặc mật khẩu mới' };
  }
  if (String(new_password).length < 8) {
    throw { success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' };
  }

  // Demo: accept token if it exists in memory store
  const found = [...resetTokensByEmail.values()].some((v) => v.reset_token === reset_token);
  if (!found) {
    throw { success: false, message: 'Reset token không hợp lệ hoặc đã hết hạn' };
  }

  return { ok: true };
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

async function verify2FALogin(user_id, code) {
  const res = await api.post(API_ROUTES.AUTH_VERIFY_2FA, { user_id, code });
  return unwrap(res);
}

async function disable2FA(code) {
  const res = await api.post(API_ROUTES.AUTH_DISABLE_2FA, { code });
  return unwrap(res);
}

export default { login, register, logout, forgotPassword, resetPassword, socialLogin, setup2FA, enable2FA, verify2FALogin, disable2FA };
