import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

async function getMyTickets() {
  const res = await api.get(API_ROUTES.MY_TICKETS);
  return unwrap(res);
}

export default { getMyTickets };
