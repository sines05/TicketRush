import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

async function lockSeats({ event_id, seat_ids, queue_token }) {
  if (!event_id || !Array.isArray(seat_ids) || seat_ids.length === 0) {
    throw { success: false, data: null, message: 'Thiếu event_id hoặc seat_ids', errorCode: 'INVALID_REQUEST' };
  }

  const res = await api.post(
    API_ROUTES.LOCK_SEATS,
    { event_id, seat_ids },
    { headers: queue_token ? { 'X-Queue-Token': queue_token } : undefined }
  );
  return unwrap(res);
}

async function checkout({ order_id }) {
  if (!order_id) {
    throw { success: false, data: null, message: 'Thiếu order_id', errorCode: 'INVALID_REQUEST' };
  }

  const res = await api.post(API_ROUTES.CHECKOUT, { order_id });
  return unwrap(res);
}

async function cancelOrder({ order_id }) {
  if (!order_id) {
    throw { success: false, data: null, message: 'Thiếu order_id', errorCode: 'INVALID_REQUEST' };
  }

  const res = await api.post(API_ROUTES.CANCEL_ORDER, { order_id });
  return unwrap(res);
}

export default { lockSeats, checkout, cancelOrder };
