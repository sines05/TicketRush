import bannerUrl from '../assets/banner-sample.svg';
import seatMap from './mock/seatMap.json';
import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

let EVENTS = [
  {
    id: 'uuid-event-1',
    title: 'Sơn Tùng M-TP - Sky Tour 2026',
    banner_url: bannerUrl,
    category: 'Âm nhạc & Lễ hội',
    start_time: '2026-05-20T20:00:00Z',
    end_time: '2026-05-20T23:30:00Z',
    description: 'Đêm nhạc bùng nổ nhất năm 2026 với sân khấu hoành tráng...',
    is_featured: true
  },
  {
    id: 'uuid-event-2',
    title: 'E-Sports Finals',
    banner_url: bannerUrl,
    category: 'Giải trí & Trải nghiệm',
    start_time: '2026-06-02T16:00:00Z',
    end_time: '2026-06-02T20:30:00Z',
    description: 'Chung kết giải đấu e-sports, vào cổng theo QR Code, hỗ trợ hàng chờ ảo.',
    is_featured: true
  },
  {
    id: 'uuid-event-3',
    title: 'Summer Festival',
    banner_url: bannerUrl,
    category: 'Âm nhạc & Lễ hội',
    start_time: '2026-07-18T15:00:00Z',
    end_time: '2026-07-18T21:30:00Z',
    description: 'Festival ngoài trời, nhiều khu vực vé; demo seat map có nhiều zones.',
    is_featured: false
  }
];

async function getEvents() {
  if (!USE_MOCK) {
    const res = await api.get(API_ROUTES.EVENTS);
    return unwrap(res);
  }

  await sleep(400);
  return EVENTS;
}

async function getFeaturedEvents() {
  if (!USE_MOCK) {
    const res = await api.get(API_ROUTES.FEATURED_EVENTS);
    return unwrap(res);
  }

  await sleep(300);
  return EVENTS.filter((e) => Boolean(e.is_featured)).slice().sort((a, b) => {
    const left = new Date(b.start_time).getTime();
    const right = new Date(a.start_time).getTime();
    return left - right;
  }).slice(0, 5);
}

async function getEventDetail(eventId) {
  if (!USE_MOCK) {
    const res = await api.get(API_ROUTES.EVENT_DETAIL(eventId));
    return unwrap(res);
  }

  await sleep(350);
  const evt = EVENTS.find((e) => e.id === eventId);
  if (!evt) throw { success: false, message: 'Không tìm thấy sự kiện' };
  return evt;
}

async function getSeatMap(eventId) {
  if (!USE_MOCK) {
    const res = await api.get(API_ROUTES.SEAT_MAP(eventId));
    return unwrap(res);
  }

  await sleep(450);
  return { ...seatMap, event_id: eventId };
}

async function createEvent(payload) {
  if (!USE_MOCK) {
    const res = await api.post(API_ROUTES.ADMIN_CREATE_EVENT, payload);
    return unwrap(res);
  }

  await sleep(450);
  const newId = `mock-event-${Math.random().toString(16).slice(2)}`;
  EVENTS.push({
    id: newId,
    title: payload.title,
    banner_url: payload.banner_url || bannerUrl,
    start_time: payload.start_time,
    end_time: payload.end_time,
    description: payload.description,
    category: payload.category || 'Khác',
    is_featured: Boolean(payload.is_featured)
  });
  return { event_id: newId };
}

async function getAdminEvents() {
  if (!USE_MOCK) {
    const res = await api.get(API_ROUTES.ADMIN_EVENTS);
    return unwrap(res);
  }

  await sleep(250);
  return EVENTS.slice().map((e) => ({
    ...e,
    is_published: Boolean(e.is_published ?? true)
  }));
}

async function updateEvent(eventId, payload) {
  if (!eventId) throw { success: false, message: 'Thiếu eventId' };

  if (!USE_MOCK) {
    const res = await api.put(API_ROUTES.ADMIN_EVENT(eventId), payload);
    return unwrap(res);
  }

  await sleep(300);
  EVENTS = EVENTS.map((e) => (
    e.id === eventId
      ? {
          ...e,
          ...payload,
          category: payload.category ?? e.category,
          is_featured: Boolean(payload.is_featured ?? e.is_featured)
        }
      : e
  ));
  return { event_id: eventId };
}

async function deleteEvent(eventId) {
  if (!eventId) throw { success: false, message: 'Thiếu eventId' };

  if (!USE_MOCK) {
    const res = await api.delete(API_ROUTES.ADMIN_EVENT(eventId));
    return unwrap(res);
  }

  await sleep(250);
  EVENTS = EVENTS.filter((e) => e.id !== eventId);
  return { event_id: eventId };
}

async function getDashboardStats(eventId) {
  if (!USE_MOCK) {
    const url = eventId ? `${API_ROUTES.ADMIN_STATS}?event_id=${eventId}` : API_ROUTES.ADMIN_STATS;
    const res = await api.get(url);
    return unwrap(res);
  }

  await sleep(300);
  const mockStats = {
    total_revenue: 50000,
    total_sold: 1000,
    occupancy_rate: 0.85,
    gender_dist: [
      { gender: 'MALE', count: 600 },
      { gender: 'FEMALE', count: 350 },
      { gender: 'OTHER', count: 50 }
    ],
    age_dist: {
      '18-24': 250,
      '25-34': 450,
      '35+': 300
    }
  };
  return mockStats;
}

export default { getEvents, getFeaturedEvents, getEventDetail, getSeatMap, createEvent, getAdminEvents, updateEvent, deleteEvent, getDashboardStats };
