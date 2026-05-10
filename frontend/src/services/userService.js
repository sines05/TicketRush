import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const STORAGE_USER = 'tr_user';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function getMe() {
  if (USE_MOCK) {
    await sleep(200);
    const user = safeJsonParse(localStorage.getItem(STORAGE_USER));
    if (!user) {
      // Fallback for demo mode: if token exists, return a default user
      const token = localStorage.getItem('tr_access_token') || localStorage.getItem('tr_token');
      if (token) {
        return {
          id: 'uuid-customer-01',
          email: 'customer@demo.com',
          full_name: 'Customer Demo',
          role: 'CUSTOMER',
          membership_tier: 'BRONZE'
        };
      }
      throw { success: false, message: 'Bạn chưa đăng nhập' };
    }
    return user;
  }

  const res = await api.get(API_ROUTES.USERS_ME);
  return unwrap(res);
}

async function updateMe({ full_name, avatar_url, gender, date_of_birth } = {}) {
  if (USE_MOCK) {
    await sleep(250);
    const prev = safeJsonParse(localStorage.getItem(STORAGE_USER));
    if (!prev) {
      throw { success: false, message: 'Bạn chưa đăng nhập' };
    }
    const next = {
      ...prev,
      ...(full_name !== undefined ? { full_name } : null),
      ...(avatar_url !== undefined ? { avatar_url } : null),
      ...(gender !== undefined ? { gender } : null),
      ...(date_of_birth !== undefined ? { date_of_birth } : null)
    };
    localStorage.setItem(STORAGE_USER, JSON.stringify(next));
    return next;
  }

  const res = await api.patch(API_ROUTES.USERS_ME, { full_name, avatar_url, gender, date_of_birth });
  return unwrap(res);
}

async function getUsers() {
  if (USE_MOCK) {
    await sleep(400);
    return [
      { id: 'u1', email: 'admin@ticketrush.com', full_name: 'Admin User', role: 'ADMIN', membership_tier: 'PLATINUM' },
      { id: 'u2', email: 'customer1@gmail.com', full_name: 'Nguyen Van A', role: 'CUSTOMER', membership_tier: 'SILVER' },
      { id: 'u3', email: 'customer2@yahoo.com', full_name: 'Tran Thi B', role: 'CUSTOMER', membership_tier: 'BRONZE' },
      { id: 'u4', email: 'vip@star.com', full_name: 'Vip Guest', role: 'CUSTOMER', membership_tier: 'GOLD' }
    ];
  }
  const res = await api.get(API_ROUTES.ADMIN_USERS);
  return unwrap(res);
}

async function updateUserRole(userId, role) {
  if (USE_MOCK) {
    await sleep(300);
    return { id: userId, role };
  }
  const res = await api.patch(API_ROUTES.ADMIN_USER_ROLE(userId), { role });
  return unwrap(res);
}

async function updateUserMembership(userId, membership_tier_id) {
  if (USE_MOCK) {
    await sleep(300);
    return { id: userId, membership_tier_id };
  }
  const res = await api.patch(API_ROUTES.ADMIN_USER_MEMBERSHIP(userId), { membership_tier_id });
  return unwrap(res);
}

async function changePassword({ old_password, new_password }) {
  if (USE_MOCK) {
    await sleep(300);
    return { success: true, message: 'Đổi mật khẩu thành công (Mock)' };
  }
  const res = await api.post(API_ROUTES.USERS_CHANGE_PASSWORD, { old_password, new_password });
  return unwrap(res);
}

async function deleteUser(userId) {
  const res = await api.delete(API_ROUTES.ADMIN_USER_DELETE(userId));
  return unwrap(res);
}

async function notifyUser(userId, message) {
  const res = await api.post(API_ROUTES.ADMIN_USER_NOTIFY(userId), { message });
  return unwrap(res);
}

export default { getMe, updateMe, getUsers, updateUserRole, updateUserMembership, changePassword, deleteUser, notifyUser };
