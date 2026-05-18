import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

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
  const res = await api.get(API_ROUTES.COMPLAINTS_MY);
  return (unwrap(res) || []).map(normalizeComplaint);
}

async function getAllComplaints() {
  const res = await api.get(API_ROUTES.ADMIN_COMPLAINTS);
  return (unwrap(res) || []).map(normalizeComplaint);
}

async function getFeaturedComplaints(limit = 12) {
  const res = await api.get(API_ROUTES.FEATURED_COMPLAINTS, { params: { limit } });
  return (unwrap(res) || []).map(normalizeComplaint).filter((complaint) => complaint.rating >= 4);
}

async function getFeaturedReviews(limit = 12) {
  const res = await api.get('/reviews/featured', { params: { limit } });
  return (unwrap(res) || []).map(normalizeComplaint).filter((review) => review.rating >= 4);
}

async function submitComplaint({ title, content, rating }) {
  const res = await api.post(API_ROUTES.COMPLAINTS, { title, content, rating });
  return normalizeComplaint(unwrap(res));
}

async function getReviews(eventId) {
  const res = await api.get(API_ROUTES.EVENT_REVIEWS(eventId));
  const data = unwrap(res);
  return data?.reviews || [];
}

async function submitReview({ event_id, rating, comment }) {
  const res = await api.post(API_ROUTES.REVIEWS, { event_id, rating, comment });
  return unwrap(res);
}

async function updateComplaintStatus(id, status) {
  const res = await api.patch(API_ROUTES.ADMIN_COMPLAINT(id), { status });
  return unwrap(res);
}

export default {
  getComplaints,
  getAllComplaints,
  getFeaturedComplaints,
  getFeaturedReviews,
  submitComplaint,
  getReviews,
  submitReview,
  updateComplaintStatus,
};
