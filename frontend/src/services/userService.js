import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

async function getMe() {
  const res = await api.get(API_ROUTES.USERS_ME);
  return unwrap(res);
}

async function updateMe({ full_name, avatar_url, gender, date_of_birth } = {}) {
  const res = await api.patch(API_ROUTES.USERS_ME, { full_name, avatar_url, gender, date_of_birth });
  return unwrap(res);
}

async function getUsers() {
  const res = await api.get(API_ROUTES.ADMIN_USERS);
  return unwrap(res);
}

async function updateUserRole(userId, role) {
  const res = await api.patch(API_ROUTES.ADMIN_USER_ROLE(userId), { role });
  return unwrap(res);
}

async function updateUserMembership(userId, membership_tier_id) {
  const res = await api.patch(API_ROUTES.ADMIN_USER_MEMBERSHIP(userId), { membership_tier_id });
  return unwrap(res);
}

async function changePassword({ old_password, new_password }) {
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
