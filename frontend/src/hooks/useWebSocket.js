import { useCallback, useEffect, useRef, useState } from 'react';

export function useWebSocket(url, { enabled = true } = {}) {
  const wsRef = useRef(null);
  const [status, setStatus] = useState('DISCONNECTED');
  const onMessageRef = useRef(null);

  // Allow consumer to register a callback that fires immediately on each message,
  // bypassing React 18 automatic batching of useState setLastMessage.
  const setOnMessage = useCallback((handler) => {
    onMessageRef.current = handler;
  }, []);

  useEffect(() => {
    if (!enabled || !url) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus('CONNECTING');

    ws.onopen = () => setStatus('CONNECTED');
    ws.onclose = () => setStatus('DISCONNECTED');
    ws.onerror = () => setStatus('ERROR');
    ws.onmessage = (ev) => {
      // Call the callback directly — no useState, no React batching
      if (onMessageRef.current) {
        onMessageRef.current(ev.data);
      }
    };

    return () => {
      ws.close();
    };
  }, [enabled, url]);

  const send = useCallback((data) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    return true;
  }, []);

  return { status, setOnMessage, send };
}
