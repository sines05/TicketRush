import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import notificationService from '../services/notificationService.js';
import { useWebSocket } from '../hooks/useWebSocket.js';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const newNotifTimeoutRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const data = await notificationService.getUnreadCount();
      setUnreadCount(data?.count ?? 0);
    } catch {
      // Silently fail
    }
  }, [user]);

  const fetchRecentNotifications = useCallback(async () => {
    if (!user) {
      setRecentNotifications([]);
      return;
    }
    try {
      const data = await notificationService.getNotifications(1, 5);
      setRecentNotifications(data?.notifications ?? []);
    } catch {
      // Silently fail
    }
  }, [user]);

  const refreshAll = useCallback(() => {
    fetchUnreadCount();
    fetchRecentNotifications();
  }, [fetchUnreadCount, fetchRecentNotifications]);

  // Fetch on user change
  useEffect(() => {
    if (user) {
      refreshAll();
    } else {
      setUnreadCount(0);
      setRecentNotifications([]);
    }
  }, [user, refreshAll]);

  // Poll every 60 seconds as fallback
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshAll, 60_000);
    return () => clearInterval(interval);
  }, [user, refreshAll]);

  // Listen for WebSocket NEW_NOTIFICATION events
  const { setOnMessage } = useWebSocket('/ws', { enabled: !!user });

  useEffect(() => {
    if (!user) return;
    setOnMessage((rawData) => {
      try {
        const msg = JSON.parse(rawData);
        if (msg.type === 'NEW_NOTIFICATION') {
          setUnreadCount((prev) => prev + 1);
          setHasNewNotification(true);
          fetchRecentNotifications();

          // Show browser notification
          notificationService.showLocalNotification(msg.title, msg.message);

          // Reset highlight after 5 seconds
          if (newNotifTimeoutRef.current) clearTimeout(newNotifTimeoutRef.current);
          newNotifTimeoutRef.current = setTimeout(() => setHasNewNotification(false), 5000);
        }
      } catch {
        // Ignore non-JSON messages
      }
    });
  }, [user, setOnMessage, fetchRecentNotifications]);

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationService.markAsRead(id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setRecentNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // Silently fail
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Silently fail
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        hasNewNotification,
        refreshAll,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
