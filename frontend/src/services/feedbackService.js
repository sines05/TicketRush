import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

async function getComplaints() {
  if (USE_MOCK) {
    await sleep(400);
    return [
      { id: 'c1', title: 'Lỗi không chọn được ghế', content: 'Tôi đã chọn ghế nhưng hệ thống báo lỗi liên tục.', status: 'RESOLVED', created_at: '2026-04-20T15:30:00Z' },
      { id: 'c2', title: 'Hoàn tiền vé', content: 'Tôi muốn hoàn tiền cho sự kiện đã bị hủy.', status: 'PENDING', created_at: '2026-05-01T09:15:00Z' }
    ];
  }
  const res = await api.get(API_ROUTES.COMPLAINTS);
  return unwrap(res);
}

async function submitComplaint({ title, content }) {
  if (USE_MOCK) {
    await sleep(600);
    return { id: Math.random().toString(36).slice(2), title, content, status: 'PENDING', created_at: new Date().toISOString() };
  }
  const res = await api.post(API_ROUTES.COMPLAINTS, { title, content });
  return unwrap(res);
}

async function getReviews(eventId) {
  if (USE_MOCK) {
    await sleep(300);
    return [
      { id: 'r1', user_name: 'Nguyễn Văn A', rating: 5, comment: 'Sự kiện tuyệt vời!', created_at: '2026-03-15T21:00:00Z' },
      { id: 'r2', user_name: 'Trần Thị B', rating: 4, comment: 'Âm thanh hơi nhỏ nhưng bù lại ca sĩ hát rất hay.', created_at: '2026-03-16T10:00:00Z' }
    ];
  }
  const res = await api.get(API_ROUTES.REVIEWS, { params: { event_id: eventId } });
  return unwrap(res);
}

async function submitReview({ event_id, rating, comment }) {
  if (USE_MOCK) {
    await sleep(500);
    return { id: Math.random().toString(36).slice(2), event_id, rating, comment, created_at: new Date().toISOString() };
  }
  const res = await api.post(API_ROUTES.REVIEWS, { event_id, rating, comment });
  return unwrap(res);
}

async function updateComplaintStatus(id, status) {
  if (USE_MOCK) {
    await sleep(400);
    return { id, status };
  }
  const res = await api.patch(`${API_ROUTES.COMPLAINTS}/${id}`, { status });
  return unwrap(res);
}

export default { getComplaints, submitComplaint, getReviews, submitReview, updateComplaintStatus };
