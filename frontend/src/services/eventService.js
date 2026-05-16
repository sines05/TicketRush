import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

async function getEvents(params = {}) {
  const res = await api.get(API_ROUTES.EVENTS, { params });
  return unwrap(res);
}

async function getFeaturedEvents(limit = 5) {
  const res = await api.get(API_ROUTES.FEATURED_EVENTS + `?limit=${limit}`);
  return unwrap(res);
}

async function getTrendingEvents(limit = 5) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 20));
  const res = await api.get(`${API_ROUTES.TRENDING_EVENTS}?limit=${safeLimit}`);
  return unwrap(res);
}

async function getEventDetail(eventId) {
  const res = await api.get(API_ROUTES.EVENT_DETAIL(eventId));
  return unwrap(res);
}

async function getSeatMap(eventId) {
  const res = await api.get(API_ROUTES.SEAT_MAP(eventId));
  return unwrap(res);
}

async function createEvent(payload) {
  const res = await api.post(API_ROUTES.ADMIN_CREATE_EVENT, payload);
  return unwrap(res);
}

async function getAdminEvents() {
  const res = await api.get(API_ROUTES.ADMIN_EVENTS);
  return unwrap(res);
}

async function updateEvent(eventId, payload) {
  if (!eventId) throw { success: false, message: 'Thiếu eventId' };
  const res = await api.put(API_ROUTES.ADMIN_EVENT(eventId), payload);
  return unwrap(res);
}

async function deleteEvent(eventId) {
  if (!eventId) throw { success: false, message: 'Thiếu eventId' };
  const res = await api.delete(API_ROUTES.ADMIN_EVENT(eventId));
  return unwrap(res);
}

async function getDashboardStats(eventId) {
  const url = eventId ? `${API_ROUTES.ADMIN_STATS}?event_id=${eventId}` : API_ROUTES.ADMIN_STATS;
  const res = await api.get(url);
  return unwrap(res);
}

async function getHeroEvents(limit = 10) {
  const res = await api.get(`${API_ROUTES.HERO_EVENTS}?limit=${limit}`);
  return unwrap(res);
}

async function getSimilarEvents(eventId, limit = 4) {
  if (!eventId) throw { success: false, message: 'Thiếu eventId' };
  const res = await api.get(API_ROUTES.SIMILAR_EVENTS(eventId), { params: { limit } });
  return unwrap(res);
}

export default { getEvents, getHeroEvents, getFeaturedEvents, getTrendingEvents, getEventDetail, getSeatMap, createEvent, getAdminEvents, updateEvent, deleteEvent, getDashboardStats, getSimilarEvents };
