import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes.jsx';
import { CATEGORY_ALL, CATEGORY_ALL_LABEL, CATEGORY_OPTIONS } from './constants/categories.js';
import { resolveMediaUrl } from './utils/media.js';
import { useAuth } from './hooks/useAuth.js';
import { ROLES } from './constants/roles.js';
import logoUrl from './assets/Logo1.png';
import { useEffect, useRef, useState } from 'react';
import notificationService from './services/notificationService.js';
import FormattedNotificationMessage from './components/notifications/FormattedNotificationMessage.jsx';
import { useNotifications } from './context/NotificationContext.jsx';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Search,
  User,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Bell,
  Check,
  ChevronRight
} from "lucide-react";
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import SearchOverlay from './components/common/SearchOverlay.jsx';
import ChatWidget from './components/ChatWidget.jsx';

const THEME_KEY = 'tr_theme';

function formatTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

const NOTIF_TYPE_ICONS = {
  SYSTEM: '🔔',
  ORDER: '🎫',
  EVENT_REMINDER: '🎶',
  PAYMENT_REMINDER: '⏰',
  PROMOTION: '🎁',
  ADMIN: '📢',
};

function NotificationBell() {
  const navigate = useNavigate();
  const { unreadCount, recentNotifications, hasNewNotification, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all relative"
      >
        <Bell className={cn(
          "h-5 w-5 transition-all",
          unreadCount > 0 ? "text-primary" : "text-muted-foreground",
          hasNewNotification && "animate-[bell-ring_0.5s_ease-in-out]"
        )} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-lg shadow-primary/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] rounded-2xl border bg-card shadow-2xl shadow-black/10 dark:shadow-black/30 z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
            <h3 className="font-bold text-base">Thông báo</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Check className="h-3 w-3" /> Đọc tất cả
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Bell className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Chưa có thông báo nào</p>
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => {
                    if (!notif.is_read) markAsRead(notif.id);
                    setIsOpen(false);
                    navigate('/profile?tab=notifications');
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 px-5 py-3.5 text-left transition-all hover:bg-muted/50 border-b border-border/50 last:border-b-0",
                    !notif.is_read && "bg-primary/5"
                  )}
                >
                  <span className="text-xl mt-0.5 flex-shrink-0">{NOTIF_TYPE_ICONS[notif.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-medium truncate", !notif.is_read && "font-bold")}>{notif.title}</p>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <FormattedNotificationMessage message={notif.message} className="mt-0.5 line-clamp-2 text-xs text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{formatTimeAgo(notif.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {recentNotifications.length > 0 && (
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/profile?tab=notifications');
              }}
              className="w-full flex items-center justify-center gap-1 px-5 py-3 text-sm font-medium text-primary border-t hover:bg-muted/30 transition-colors"
            >
              Xem tất cả thông báo <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const navItemClass = (isActive) => cn(
    "relative px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
    isActive ? "text-primary" : "text-muted-foreground"
  );

  useEffect(() => {
    notificationService.registerPush().catch(console.error);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const [eventSearch, setEventSearch] = useState('');

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar_url]);

  useEffect(() => {
    if (location.pathname !== '/') return;
    const params = new URLSearchParams(location.search);
    setEventSearch(params.get('q') || '');
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (location.pathname !== '/') return;

    const handle = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      const current = params.get('q') || '';
      const next = eventSearch.trim();

      if (next === current) return;

      if (next) params.set('q', next);
      else params.delete('q');

      const nextSearch = params.toString();
      navigate({ pathname: '/', search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
    }, 250);

    return () => clearTimeout(handle);
  }, [eventSearch, location.pathname, location.search, navigate]);

  const isAuthPage = location.pathname.startsWith('/auth');
  const isZoneMapBuilderPage = location.pathname === '/admin/events/zone-map';
  const isStandalonePage = isAuthPage || isZoneMapBuilderPage;

  return (
    <div className={`min-h-screen flex flex-col text-foreground ${isZoneMapBuilderPage ? 'bg-transparent' : 'bg-background'}`}>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      {!isStandalonePage && (
        <header className="sticky top-0 z-50 w-full glass-surface glass-border border-b-0 shadow-lg shadow-black/5 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4 md:gap-10">
              <Link to="/" className="flex items-center space-x-3 transition-all hover:scale-[1.03] active:scale-95">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shadow-inner">
                  <img src={logoUrl} alt="TicketRush" className="h-7 w-7 object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xl leading-none tracking-tighter bg-gradient-to-br from-primary via-primary to-secondary bg-clip-text text-transparent">
                    TicketRush
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 leading-none mt-1.5 hidden sm:block">
                    Premium Ticketing
                  </span>
                </div>
              </Link>
              <nav className="hidden md:flex items-center space-x-2 text-sm font-bold">
                {user && (
                  <>
                    <Link to="/membership" className={navItemClass(location.pathname === '/membership')}>Thành viên</Link>
                    <Link to="/my-tickets" className={navItemClass(location.pathname === '/my-tickets')}>Vé của tôi</Link>
                    <Link to="/feedback" className={navItemClass(location.pathname === '/feedback')}>Hỗ trợ</Link>
                  </>
                )}
                {user?.role === ROLES.ADMIN && (
                  <Link to="/admin/dashboard" className={navItemClass(location.pathname.startsWith('/admin'))}>
                    Admin
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex flex-1 items-center justify-end space-x-5">
              <div className="hidden lg:flex flex-1 items-center justify-center px-4">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="w-full max-w-[500px] flex items-center bg-white dark:bg-white/10 rounded-full h-11 px-4 shadow-sm border border-black/5 dark:border-white/10 group transition-all hover:shadow-md"
                >
                  <Search className="h-5 w-5 text-gray-400 dark:text-white/40 mr-3" />
                  <span className="text-sm text-gray-400 dark:text-white/40 flex-1 text-left">Bạn tìm gì hôm nay?</span>
                  <div className="h-6 w-[1px] bg-gray-200 dark:bg-white/10 mx-3" />
                  <span className="text-sm font-bold text-gray-900 dark:text-white/80 group-hover:text-primary transition-colors">Tìm kiếm</span>
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="h-10 w-10 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-indigo-400" />}
                  <span className="sr-only">Toggle theme</span>
                </Button>

                {user && <NotificationBell />}

                {!user ? (
                  <Button variant="default" size="sm" onClick={() => navigate('/auth/login')} className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20">
                    Đăng nhập
                  </Button>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-xs font-bold leading-none">{user.full_name || user.email.split('@')[0]}</span>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-tighter leading-none mt-1">{user.role}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl border-2 border-primary/10 bg-muted/30 overflow-hidden hover:border-primary/30 transition-all"
                      onClick={() => navigate('/profile')}
                    >
                      {user.avatar_url && !avatarFailed ? (
                        <img
                          src={resolveMediaUrl(user.avatar_url)}
                          alt="avatar"
                          className="h-full w-full object-cover"
                          onError={() => setAvatarFailed(true)}
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 md:hidden rounded-xl bg-muted/20"
                      onClick={() => setIsMobileMenuOpen(true)}
                    >
                      <Menu className="h-6 w-6" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Menu Slide-over */}
          <div className={cn(
            "fixed inset-0 z-[100] md:hidden transition-all duration-500 ease-spring",
            isMobileMenuOpen ? "visible" : "invisible"
          )}>
            {/* Backdrop */}
            <div
              className={cn(
                "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ease-spring",
                isMobileMenuOpen ? "opacity-100" : "opacity-0"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Panel */}
            <div className={cn(
              "absolute right-0 top-0 h-full w-[300px] glass-surface glass-border border-y-0 border-r-0 p-8 shadow-2xl transition-transform duration-500 ease-spring flex flex-col",
              isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}>
              <div className="flex items-center justify-between mb-10">
                <span className="font-extrabold text-xl tracking-tighter">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl">
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsSearchOpen(true);
                }}
                className="relative w-full mb-8 flex items-center space-x-3 px-4 h-12 bg-muted/30 rounded-xl text-muted-foreground"
              >
                <Search className="h-5 w-5" />
                <span className="text-base font-bold">Tìm sự kiện...</span>
              </button>

              <nav className="flex flex-col space-y-1 flex-1">
                {user && (
                  <>
                    <Link to="/membership" className="px-4 py-3 text-base font-bold hover:text-primary hover:bg-primary/5 rounded-xl transition-all">Thành viên</Link>
                    <Link to="/my-tickets" className="px-4 py-3 text-base font-bold hover:text-primary hover:bg-primary/5 rounded-xl transition-all">Vé của tôi</Link>
                    <Link to="/feedback" className="px-4 py-3 text-base font-bold hover:text-primary hover:bg-primary/5 rounded-xl transition-all">Hỗ trợ</Link>
                    <Link to="/profile" className="px-4 py-3 text-base font-bold hover:text-primary hover:bg-primary/5 rounded-xl transition-all">Hồ sơ cá nhân</Link>
                  </>
                )}
                {user?.role === ROLES.ADMIN && (
                  <Link to="/admin/dashboard" className="px-4 py-3 text-base font-bold hover:text-primary hover:bg-primary/5 rounded-xl transition-all text-primary">Admin Dashboard</Link>
                )}
              </nav>

              {user && (
                <div className="pt-6 border-t border-white/10">
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="flex w-full items-center px-4 py-4 text-base font-bold text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {(location.pathname === '/' || location.pathname === '/search') && (
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
            <nav className="flex items-center gap-1 overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {(() => {
                const params = new URLSearchParams(location.search);
                const active = params.get('category') || CATEGORY_ALL;

                function go(next) {
                  const p = new URLSearchParams();
                  if (next && next !== CATEGORY_ALL) p.set('category', next);
                  const nextSearch = p.toString();
                  navigate({ pathname: '/search', search: nextSearch ? `?${nextSearch}` : '' });
                }

                return (
                  <>
                    <Button
                      variant={active === CATEGORY_ALL ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => go(CATEGORY_ALL)}
                      className={cn(
                        "rounded-full whitespace-nowrap px-4",
                        active === CATEGORY_ALL && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                      )}
                    >
                      {CATEGORY_ALL_LABEL}
                    </Button>

                    {CATEGORY_OPTIONS.map((c) => (
                      <Button
                        key={c.key}
                        variant={active === c.key ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => go(c.key)}
                        className={cn(
                          "rounded-full whitespace-nowrap px-4",
                          active === c.key && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                        )}
                      >
                        {c.label}
                      </Button>
                    ))}
                  </>
                );
              })()}
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1">
        <main className={isStandalonePage ? 'w-full min-h-screen' : 'mx-auto w-full max-w-[1440px] px-4 md:px-6 py-12'}>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </main>
      </div>

      {!isStandalonePage && (
        <footer className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 py-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
              <div className="col-span-1 md:col-span-2">
                <Link to="/" className="flex items-center space-x-2">
                  <img src={logoUrl} alt="TicketRush" className="h-6 w-6" />
                  <span className="font-bold text-lg tracking-tight">TicketRush</span>
                </Link>
                <p className="mt-4 text-sm text-muted-foreground max-w-xs">
                  Nền tảng săn vé sự kiện hàng đầu, mang đến trải nghiệm mua vé nhanh chóng, an toàn và minh bạch.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider">Khám phá</h3>
                <ul className="mt-4 space-y-2">
                  <li><Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sự kiện mới</Link></li>
                  <li><Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Phổ biến</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider">Hỗ trợ</h3>
                <ul className="mt-4 space-y-2">
                  <li><Link to="/feedback" className="text-sm text-muted-foreground hover:text-primary transition-colors">Liên hệ</Link></li>
                  <li><Link to="/membership" className="text-sm text-muted-foreground hover:text-primary transition-colors">Thành viên</Link></li>
                  <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Điều khoản</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-12 border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} TicketRush. All rights reserved.
              </p>
              <div className="flex space-x-6">
                <span className="text-xs text-muted-foreground">Phát triển bởi: Nguyễn Quế Sơn, Nguyễn Tuấn Đức, Đỗ Ngọc Khánh</span>
              </div>
            </div>
          </div>
        </footer>
      )}
      {!isStandalonePage && <ChatWidget />}
    </div>
  );
}
