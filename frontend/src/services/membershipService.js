import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

async function getTiers() {
  const res = await api.get(API_ROUTES.MEMBERSHIP_TIERS);
  return unwrap(res);
}

async function getMyMembership() {
  const res = await api.get(API_ROUTES.MY_MEMBERSHIP);
  return unwrap(res);
}

async function upgradeTier(tierId) {
  const res = await api.post(API_ROUTES.MEMBERSHIP_UPGRADE, { tier_id: tierId });
  return unwrap(res);
}

export default { getTiers, getMyMembership, upgradeTier };
