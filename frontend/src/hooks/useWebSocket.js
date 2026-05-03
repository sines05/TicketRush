import { useEffect, useMemo, useRef, useState } from 'react';

export function useWebSocket(url, { enabled = true } = {}) {
  const wsRef = useRef(null);
  const [status, setStatus] = useState('DISCONNECTED');
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    if (!enabled || !url) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus('CONNECTING');

    ws.onopen = () => setStatus('CONNECTED');
    ws.onclose = () => setStatus('DISCONNECTED');
    ws.onerror = () => setStatus('ERROR');
    ws.onmessage = (ev) => setLastMessage(ev.data);

    return () => {
      ws.close();
    };
  }, [enabled, url]);

  const send = useMemo(() => {
    return (data) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    };
  }, []);

  return { status, lastMessage, send };
}
