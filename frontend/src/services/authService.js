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
    user_id: role === ROLES.ADMIN ? 'uuid-admin-01' : 'uuid-customer-01',
    full_name: role === ROLES.ADMIN ? 'Admin Demo' : 'Customer Demo',
    role,
    access_token: makeToken(email)
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

  return {
    // backend trả 201 + data null; demo FE auto-login luôn để test flow
    user_id: `uuid-${Math.random().toString(16).slice(2)}`,
    full_name,
    role: ROLES.CUSTOMER,
    access_token: makeToken(email)
  };
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
  if (String(new_password).length < 6) {
    throw { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
  }

  // Demo: accept token if it exists in memory store
  const found = [...resetTokensByEmail.values()].some((v) => v.reset_token === reset_token);
  if (!found) {
    throw { success: false, message: 'Reset token không hợp lệ hoặc đã hết hạn' };
  }

  return { ok: true };
}

export default { login, register, forgotPassword, resetPassword };
