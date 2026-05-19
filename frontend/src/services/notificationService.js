import { api, unwrap } from './api.js';

async function registerPush() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return;
  }

  const permission = await window.Notification.requestPermission();
  if (permission === 'granted') {
    const token = 'mock-fcm-token-' + Math.random().toString(16).slice(2);
    await api.post('/users/notification-token', { token });
    return token;
  }
}

function showLocalNotification(title, body) {
  if (window.Notification && window.Notification.permission === 'granted') {
    new window.Notification(title, { body, icon: '/TicketRush.png' });
  }
}

async function getNotifications(page = 1, limit = 20) {
  const res = await api.get(`/notifications?page=${page}&limit=${limit}`);
  return unwrap(res);
}

async function getUnreadCount() {
  const res = await api.get('/notifications/unread-count');
  return unwrap(res);
}

async function markAsRead(id) {
  const res = await api.patch(`/notifications/${id}/read`);
  return unwrap(res);
}

async function markAllAsRead() {
  const res = await api.patch('/notifications/read-all');
  return unwrap(res);
}

async function deleteNotification(id) {
  const res = await api.delete(`/notifications/${id}`);
  return unwrap(res);
}

async function adminSendNotification(data) {
  const res = await api.post('/admin/notifications/send', data);
  return unwrap(res);
}

async function adminGetNotifications(page = 1, limit = 20) {
  const res = await api.get(`/admin/notifications?page=${page}&limit=${limit}`);
  return unwrap(res);
}

export default {
  registerPush,
  showLocalNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  adminSendNotification,
  adminGetNotifications
};
