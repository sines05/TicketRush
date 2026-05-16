export const API_ROUTES = Object.freeze({
  AUTH_LOGIN: '/auth/login',
  AUTH_VERIFY_2FA: '/auth/verify-2fa',
  AUTH_REGISTER: '/auth/register',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  AUTH_GOOGLE_LOGIN: '/auth/google/login',
  AUTH_FACEBOOK_LOGIN: '/auth/facebook/login',
  AUTH_SETUP_2FA: '/auth/setup-2fa',
  AUTH_ENABLE_2FA: '/auth/enable-2fa',
  AUTH_DISABLE_2FA: '/auth/disable-2fa',
  AUTH_LOGOUT: '/auth/logout',

  EVENTS: '/events',
  HERO_EVENTS: '/events/hero',
  TRENDING_EVENTS: '/events/trending',
  FEATURED_EVENTS: '/events/featured',
  EVENT_DETAIL: (idOrSlug) => `/events/${idOrSlug}`,
  SIMILAR_EVENTS: (id) => `/events/${id}/similar`,
  SEAT_MAP: (idOrSlug) => `/events/${idOrSlug}/seat-map`,

  QUEUE_JOIN: '/queue/join',
  QUEUE_STATUS: '/queue/status',

  LOCK_SEATS: '/orders/lock-seats',
  CHECKOUT: '/orders/checkout',
  CANCEL_ORDER: '/orders/cancel',

  MY_TICKETS: '/tickets/my-tickets',
  ADMIN_TICKETS: '/admin/tickets',
  ADMIN_TICKET_CHECKIN: '/admin/tickets/check-in',

  UPLOADS: '/uploads',

  USERS_ME: '/users/me',
  USERS_CHANGE_PASSWORD: '/users/change-password',

  ADMIN_CREATE_EVENT: '/admin/events',
  ADMIN_EVENTS: '/admin/events',
  ADMIN_EVENT: (eventId) => `/admin/events/${eventId}`,
  ADMIN_STATS: '/admin/dashboard/stats',

  MEMBERSHIP_TIERS: '/membership/tiers',
  MY_MEMBERSHIP: '/membership/me',
  MEMBERSHIP_UPGRADE: '/membership/upgrade',
  FEATURED_COMPLAINTS: '/complaints/featured',
  COMPLAINTS_MY: '/complaints/my',
  COMPLAINTS: '/complaints',
  ADMIN_COMPLAINTS: '/admin/complaints',
  ADMIN_COMPLAINT: (complaintId) => `/admin/complaints/${complaintId}`,
  REVIEWS: '/reviews',
  EVENT_REVIEWS: (eventId) => `/events/${eventId}/reviews`,
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_ROLE: (userId) => `/admin/users/${userId}/role`,
  ADMIN_USER_MEMBERSHIP: (userId) => `/admin/users/${userId}/membership`,
  ADMIN_USER_DELETE: (userId) => `/admin/users/${userId}`,
  ADMIN_USER_NOTIFY: (userId) => `/admin/users/${userId}/notify`
});
