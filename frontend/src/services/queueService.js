import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// In-memory mock queue state (per user/session)
const queuesByEvent = new Map();

async function joinQueue({ event_id }) {
  if (!USE_MOCK) {
    const res = await api.post(API_ROUTES.QUEUE_JOIN, { event_id });
    return unwrap(res);
  }

  await sleep(350);
  if (!event_id) throw { success: false, message: 'Thiếu event_id' };

  const current = queuesByEvent.get(event_id) ?? {
    status: 'WAITING',
    queue_position: 40 + Math.floor(Math.random() * 60)
  };

  // Simulate progress
  if (current.status === 'WAITING') {
    current.queue_position = Math.max(0, current.queue_position - (2 + Math.floor(Math.random() * 5)));
    if (current.queue_position <= 0) {
      current.status = 'PASSED';
      current.queue_token = `token-${event_id}-${Math.random().toString(16).slice(2)}`;
    }
  }

  queuesByEvent.set(event_id, current);

  if (current.status === 'WAITING') {
    return { status: 'WAITING', queue_position: current.queue_position };
  }

  return { status: 'PASSED', queue_token: current.queue_token };
}

async function getStatus({ event_id }) {
  if (!USE_MOCK) {
    const res = await api.get(API_ROUTES.QUEUE_STATUS, { params: { event_id } });
    return unwrap(res);
  }

  // Mock mode: keep using joinQueue() polling behavior
  return joinQueue({ event_id });
}

function startPollingJoin({ event_id, intervalMs = 1200, onUpdate, onPassed, onError }) {
  let active = true;

  if (!USE_MOCK) {
    async function pollStatus() {
      try {
        const st = await getStatus({ event_id });
        if (!active) return;
        onUpdate?.(st);

        if (st.status === 'allowed') {
          onPassed?.(st);
          return;
        }

        setTimeout(pollStatus, intervalMs);
      } catch (e) {
        if (!active) return;
        onError?.(e);
      }
    }

    async function start() {
      try {
        const joined = await joinQueue({ event_id });
        if (!active) return;

        if (joined.status === 'allowed') {
          onPassed?.(joined);
          return;
        }

        onUpdate?.(joined);
        setTimeout(pollStatus, intervalMs);
      } catch (e) {
        if (!active) return;
        onError?.(e);
      }
    }

    setTimeout(start, 200);

    return () => {
      active = false;
    };
  }

  async function tick() {
    try {
      const status = await joinQueue({ event_id });
      if (!active) return;
      onUpdate?.(status);

      if (status.status === 'PASSED') {
        onPassed?.(status);
        return;
      }

      setTimeout(tick, intervalMs);
    } catch (e) {
      if (!active) return;
      onError?.(e);
    }
  }

  setTimeout(tick, 200);

  return () => {
    active = false;
  };
}

export default { joinQueue, getStatus, startPollingJoin };
