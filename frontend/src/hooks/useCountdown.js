import { useEffect, useMemo, useState } from 'react';

function toEndsAtMs({ seconds, endsAt }) {
  if (endsAt) {
    const ms = Date.parse(endsAt);
    if (Number.isFinite(ms)) return ms;
  }
  const safeSeconds = Number(seconds) || 0;
  return Date.now() + safeSeconds * 1000;
}

export function useCountdown({ seconds, endsAt }) {
  const [endsAtMs, setEndsAtMs] = useState(() => toEndsAtMs({ seconds, endsAt }));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = useMemo(() => {
    const deltaMs = Math.max(0, endsAtMs - now);
    return Math.ceil(deltaMs / 1000);
  }, [endsAtMs, now]);

  const isExpired = secondsLeft <= 0;

  function reset() {
    setEndsAtMs(toEndsAtMs({ seconds, endsAt: null }));
  }

  return { secondsLeft, isExpired, reset };
}

export function formatCountdown(secondsLeft) {
  const total = Math.max(0, secondsLeft);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
