import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

async function getMyTickets() {
  const res = await api.get(API_ROUTES.MY_TICKETS);
  return unwrap(res);
}

async function getAdminTickets(eventId) {
  const url = eventId ? `${API_ROUTES.ADMIN_TICKETS}?event_id=${eventId}` : API_ROUTES.ADMIN_TICKETS;
  const res = await api.get(url);
  return unwrap(res);
}

async function checkInTicket(qrCodeToken) {
  const res = await api.post(API_ROUTES.ADMIN_TICKET_CHECKIN, { qr_code_token: qrCodeToken });
  return unwrap(res);
}

export default { getMyTickets, getAdminTickets, checkInTicket };
