import { useCallback, useEffect, useRef, useState } from 'react';

export function useWebSocket(url, { enabled = true } = {}) {
  const wsRef = useRef(null);
  const [status, setStatus] = useState('DISCONNECTED');
  const onMessageRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Allow consumer to register a callback that fires immediately on each message,
  // bypassing React 18 automatic batching of useState setLastMessage.
  const setOnMessage = useCallback((handler) => {
    onMessageRef.current = handler;
  }, []);

  useEffect(() => {
    if (!enabled || !url) return;

    let timeoutId;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;

      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      let socketUrl = url;

      if (!url.startsWith('ws')) {
        if (apiBase.startsWith('http')) {
          // Absolute URL: http://localhost:8080/api/v1 -> ws://localhost:8080/ws
          const base = apiBase.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
          socketUrl = `${base}${url}`;
        } else {
          // Relative URL: use window.location.host
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          socketUrl = `${wsProtocol}//${window.location.host}${url}`;
        }
      }

      const ws = new WebSocket(socketUrl);
      wsRef.current = ws;
      setStatus('CONNECTING');

      let pingInterval;

      ws.onopen = () => {
        if (isUnmounted) {
          ws.close();
          return;
        }
        setStatus('CONNECTED');
        reconnectCountRef.current = 0;

        // Heartbeat to keep connection alive
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 30000);
      };

      ws.onclose = () => {
        if (pingInterval) clearInterval(pingInterval);
        if (isUnmounted) return;
        setStatus('DISCONNECTED');
        if (reconnectCountRef.current < maxReconnectAttempts) {
          const delay = Math.min(30000, 1000 * Math.pow(2, reconnectCountRef.current));
          reconnectCountRef.current += 1;
          timeoutId = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        if (isUnmounted) return;
        setStatus('ERROR');
      };

      ws.onmessage = (ev) => {
        if (isUnmounted) return;
        // Call the callback directly — no useState, no React batching
        if (onMessageRef.current) {
          onMessageRef.current(ev.data);
        }
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (wsRef.current) {
        wsRef.current.close();
      }
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
