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

export default { getMe, updateMe };
