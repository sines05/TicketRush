export const API_ROUTES = Object.freeze({
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',

  EVENTS: '/events',
  TRENDING_EVENTS: '/events/trending',
  FEATURED_EVENTS: '/events/featured',
  EVENT_DETAIL: (eventId) => `/events/${eventId}`,
  SEAT_MAP: (eventId) => `/events/${eventId}/seat-map`,

  QUEUE_JOIN: '/queue/join',
  QUEUE_STATUS: '/queue/status',

  LOCK_SEATS: '/orders/lock-seats',
  CHECKOUT: '/orders/checkout',

  MY_TICKETS: '/tickets/my-tickets',
  ADMIN_TICKETS: '/admin/tickets',
  ADMIN_TICKET_CHECKIN: '/admin/tickets/check-in',

  UPLOADS: '/uploads',

  USERS_ME: '/users/me',

  ADMIN_CREATE_EVENT: '/admin/events',
  ADMIN_EVENTS: '/admin/events',
  ADMIN_EVENT: (eventId) => `/admin/events/${eventId}`,
  ADMIN_STATS: '/admin/dashboard/stats'
});
