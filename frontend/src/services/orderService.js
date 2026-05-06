import { API_ROUTES } from '../constants/apiRoutes.js';
import { CHECKOUT_STATUS } from '../constants/status.js';
import { api, unwrap } from './api.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const orders = new Map();

function nowIsoPlusSeconds(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function sumAmount(seats) {
  return (seats || []).reduce((sum, s) => sum + (Number(s.price) || 0), 0);
}

async function lockSeats({ event_id, seat_ids, queue_token, selectedSeats }) {
  if (!event_id || !Array.isArray(seat_ids) || seat_ids.length === 0) {
    throw { success: false, data: null, message: 'Thiếu event_id hoặc seat_ids', errorCode: 'INVALID_REQUEST' };
  }

  if (!USE_MOCK) {
    const res = await api.post(
      API_ROUTES.LOCK_SEATS,
      { event_id, seat_ids },
      { headers: queue_token ? { 'X-Queue-Token': queue_token } : undefined }
    );
    return unwrap(res);
  }

  await sleep(450);

  // demo conflict rule
  if (seat_ids.some((id) => String(id).includes('taken'))) {
    throw {
      success: false,
      data: null,
      message: 'Ghế đã bị người khác chọn.',
      errorCode: 'SEAT_ALREADY_TAKEN'
    };
  }

  const order_id = `uuid-order-${Math.random().toString(16).slice(2)}`;
  const expires_at = nowIsoPlusSeconds(600);
  const total_amount = sumAmount(selectedSeats);

  const order = {
    order_id,
    total_amount,
    status: CHECKOUT_STATUS.PENDING,
    expires_at,
    seat_ids
  };

  orders.set(order_id, order);
  return order;
}

async function checkout({ order_id }) {
  if (!order_id) {
    throw { success: false, data: null, message: 'Thiếu order_id', errorCode: 'INVALID_REQUEST' };
  }

  if (!USE_MOCK) {
    const res = await api.post(API_ROUTES.CHECKOUT, { order_id });
    return unwrap(res);
  }

  await sleep(500);

  const order = orders.get(order_id);
  if (!order) {
    throw { success: false, data: null, message: 'Không tìm thấy đơn hàng', errorCode: 'ORDER_NOT_FOUND' };
  }

  const isExpired = Date.parse(order.expires_at) <= Date.now();
  if (isExpired) {
    throw { success: false, data: null, message: 'Đơn hàng đã hết hạn giữ chỗ 10 phút.', errorCode: 'ORDER_EXPIRED' };
  }

  const completed = {
    order_id,
    status: CHECKOUT_STATUS.COMPLETED,
    ticket_count: order.seat_ids.length
  };

  orders.set(order_id, { ...order, status: CHECKOUT_STATUS.COMPLETED });
  return completed;
}

async function cancelOrder({ order_id }) {
  if (!order_id) {
    throw { success: false, data: null, message: 'Thiếu order_id', errorCode: 'INVALID_REQUEST' };
  }

  if (!USE_MOCK) {
    const res = await api.post(API_ROUTES.CANCEL_ORDER, { order_id });
    return unwrap(res);
  }

  await sleep(300);

  const order = orders.get(order_id);
  if (order) {
    orders.set(order_id, { ...order, status: 'CANCELLED' });
  }

  return { success: true, order_id, status: 'CANCELLED' };
}

export default { lockSeats, checkout, cancelOrder };
