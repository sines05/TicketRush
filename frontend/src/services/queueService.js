import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

async function joinQueue({ event_id }) {
  const res = await api.post(API_ROUTES.QUEUE_JOIN, { event_id });
  return unwrap(res);
}

async function getStatus({ event_id }) {
  const res = await api.get(API_ROUTES.QUEUE_STATUS, { params: { event_id } });
  return unwrap(res);
}

export default { joinQueue, getStatus };
