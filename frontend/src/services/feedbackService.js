import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

function normalizeRating(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(5, Math.max(1, Math.round(parsed)));
}

function normalizeComplaint(complaint) {
  if (!complaint) return complaint;

  return {
    ...complaint,
    rating: normalizeRating(
      complaint.rating ??
      complaint.rate ??
      complaint.stars ??
      complaint.score ??
      complaint.rating_score ??
      complaint.satisfaction_rating
    ),
  };
}

async function getComplaints() {
  if (USE_MOCK) {
    await sleep(400);
    return [
      {
        id: 'c1',
        title: 'Lỗi không chọn được ghế',
        content: 'Tôi đã chọn ghế nhưng hệ thống báo lỗi liên tục.',
        rating: 2,
        status: 'RESOLVED',
        created_at: '2026-04-20T15:30:00Z',
      },
      {
        id: 'c2',
        title: 'Hoàn tiền vé',
        content: 'Tôi muốn hoàn tiền cho sự kiện đã bị hủy.',
        rating: 3,
        status: 'PENDING',
        created_at: '2026-05-01T09:15:00Z',
      },
    ].map(normalizeComplaint);
  }
  const res = await api.get(API_ROUTES.COMPLAINTS_MY);
  return (unwrap(res) || []).map(normalizeComplaint);
}

async function getAllComplaints() {
  if (USE_MOCK) {
    await sleep(400);
    return [
      {
        id: 'c1',
        title: 'Lỗi không chọn được ghế',
        content: 'Tôi đã chọn ghế nhưng hệ thống báo lỗi liên tục.',
        rating: 2,
        status: 'RESOLVED',
        created_at: '2026-04-20T15:30:00Z',
        user_name: 'Nguyễn Văn A',
        user_email: 'user1@example.com',
      },
      {
        id: 'c2',
        title: 'Hoàn tiền vé',
        content: 'Tôi muốn hoàn tiền cho sự kiện đã bị hủy.',
        rating: 3,
        status: 'PENDING',
        created_at: '2026-05-01T09:15:00Z',
        user_name: 'Trần Thị B',
        user_email: 'user2@example.com',
      },
    ].map(normalizeComplaint);
  }
  const res = await api.get(API_ROUTES.ADMIN_COMPLAINTS);
  return (unwrap(res) || []).map(normalizeComplaint);
}

async function getFeaturedComplaints(limit = 12) {
  if (USE_MOCK) {
    await sleep(320);
    return [
      {
        id: 'featured-c1',
        title: 'Hỗ trợ đổi vé rất nhanh',
        content: 'Mình gửi report về sai email nhận vé và được hỗ trợ cập nhật trong vài phút. Vé QR vào cổng hoạt động ổn.',
        rating: 5,
        status: 'RESOLVED',
        created_at: '2026-05-03T08:45:00Z',
        user_name: 'Minh Anh',
      },
      {
        id: 'featured-c2',
        title: 'Xử lý hàng chờ rõ ràng',
        content: 'Lúc mở bán đông nhưng hệ thống báo vị trí chờ minh bạch. Khi đến lượt, đặt ghế không bị trùng.',
        rating: 5,
        status: 'RESOLVED',
        created_at: '2026-05-04T13:20:00Z',
        user_name: 'Hoàng Nam',
      },
      {
        id: 'featured-c3',
        title: 'Admin phản hồi khiếu nại có tâm',
        content: 'Report của mình về thanh toán pending được kiểm tra và xác nhận lại vé ngay trong ngày.',
        rating: 4,
        status: 'RESOLVED',
        created_at: '2026-05-06T10:10:00Z',
        user_name: 'Bảo Trâm',
      },
      {
        id: 'featured-c4',
        title: 'Trải nghiệm chọn ghế mượt',
        content: 'Sơ đồ ghế cập nhật trạng thái liên tục, không cần tải lại trang. Phần giữ chỗ 10 phút rất dễ theo dõi.',
        rating: 5,
        status: 'RESOLVED',
        created_at: '2026-05-07T16:05:00Z',
        user_name: 'Quốc Huy',
      },
      {
        id: 'featured-c5',
        title: 'Thông báo vé đầy đủ',
        content: 'Sau khi gửi phản ánh, mình nhận được email hướng dẫn và vé trong tài khoản hiển thị đúng thông tin.',
        rating: 4,
        status: 'RESOLVED',
        created_at: '2026-05-08T11:35:00Z',
        user_name: 'Thanh Mai',
      },
    ].map(normalizeComplaint).filter((complaint) => complaint.rating >= 4).slice(0, limit);
  }

  const res = await api.get(API_ROUTES.FEATURED_COMPLAINTS, { params: { limit } });
  return (unwrap(res) || []).map(normalizeComplaint).filter((complaint) => complaint.rating >= 4);
}

async function submitComplaint({ title, content, rating }) {
  if (USE_MOCK) {
    await sleep(600);
    return {
      id: Math.random().toString(36).slice(2),
      title,
      content,
      rating,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
  }
  const res = await api.post(API_ROUTES.COMPLAINTS, { title, content, rating });
  return normalizeComplaint(unwrap(res));
}

async function getReviews(eventId) {
  if (USE_MOCK) {
    await sleep(300);
    return [
      { id: 'r1', user_name: 'Nguyễn Văn A', rating: 5, comment: 'Sự kiện tuyệt vời!', created_at: '2026-03-15T21:00:00Z' },
      { id: 'r2', user_name: 'Trần Thị B', rating: 4, comment: 'Âm thanh hơi nhỏ nhưng bù lại ca sĩ hát rất hay.', created_at: '2026-03-16T10:00:00Z' },
    ];
  }
  const res = await api.get(API_ROUTES.EVENT_REVIEWS(eventId));
  const data = unwrap(res);
  return data?.reviews || [];
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
  const res = await api.patch(API_ROUTES.ADMIN_COMPLAINT(id), { status });
  return unwrap(res);
}

export default {
  getComplaints,
  getAllComplaints,
  getFeaturedComplaints,
  submitComplaint,
  getReviews,
  submitReview,
  updateComplaintStatus,
};
