import { api } from './api.js';

async function registerPush() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return;
  }

  const permission = await window.Notification.requestPermission();
  if (permission === 'granted') {
    // In a real app with FCM, you'd get the token here
    // const token = await getToken(messaging, { vapidKey: '...' });
    const token = 'mock-fcm-token-' + Math.random().toString(16).slice(2);
    
    // Send token to backend
    await api.post('/users/notification-token', { token });
    return token;
  }
}

function showLocalNotification(title, body) {
  if (window.Notification && window.Notification.permission === 'granted') {
    new window.Notification(title, { body, icon: '/TicketRush.png' });
  }
}

export default { registerPush, showLocalNotification };
