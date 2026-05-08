import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

async function getTiers() {
  if (USE_MOCK) {
    await sleep(300);
    return [
      { id: 't1', name: 'BRONZE', priority_level: 0, description: 'Hạng mặc định cho mọi thành viên.' },
      { id: 't2', name: 'SILVER', priority_level: 1, description: 'Ưu tiên xếp hàng mức trung bình.' },
      { id: 't3', name: 'GOLD', priority_level: 2, description: 'Ưu tiên xếp hàng mức cao, nhận thông báo sớm.' },
      { id: 't4', name: 'PLATINUM', priority_level: 3, description: 'Ưu tiên tối đa, đặc quyền vào thẳng phòng vé.' }
    ];
  }
  const res = await api.get(API_ROUTES.MEMBERSHIP_TIERS);
  return unwrap(res);
}

async function getMyMembership() {
  if (USE_MOCK) {
    await sleep(400);
    return {
      tier: 'SILVER',
      points: 1250,
      next_tier_points: 2500,
      joined_at: '2025-12-01T10:00:00Z'
    };
  }
  const res = await api.get(API_ROUTES.MY_MEMBERSHIP);
  return unwrap(res);
}

async function upgradeTier(tierId) {
  if (USE_MOCK) {
    await sleep(500);
    return { message: 'Upgraded successfully (mock)' };
  }
  const res = await api.post(API_ROUTES.MEMBERSHIP_UPGRADE, { tier_id: tierId });
  return unwrap(res);
}

export default { getTiers, getMyMembership, upgradeTier };
