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

  // Synchronize theme across components using storage and custom events
  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved && saved !== theme) {
        setTheme(saved);
      }
    };
    window.addEventListener('storage', handleThemeChange);
    window.addEventListener('theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
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
  const isSeatMapPage = location.pathname === '/booking/seats';
  const isStandalonePage = isAuthPage || isZoneMapBuilderPage || isSeatMapPage;

  return (
    <div className={cn(
      "min-h-screen flex flex-col text-foreground",
      isSeatMapPage ? "h-screen min-h-0 overflow-hidden bg-background text-foreground" :
      isZoneMapBuilderPage ? "bg-transparent" : "bg-background"
    )}>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      {!isStandalonePage && (
        <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300">
          <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-12">
              <Link to="/" className="flex items-center gap-3.5 transition-all hover:scale-[1.02] active:scale-95 group">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-[14px] bg-brand-600 shadow-[0_10px_20px_rgba(45,194,117,0.25)] group-hover:rotate-6 transition-transform">
                  <img src={logoUrl} alt="TicketRush" className="h-7 w-7 object-contain brightness-0 invert" />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-2xl leading-none tracking-tight text-slate-900 dark:text-white">
                    Ticket<span className="text-brand-600">Rush</span>
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 leading-none mt-1.5 hidden sm:block">
                    Elevated Experiences
                  </span>
                </div>
              </Link>
              <nav className="hidden lg:flex items-center gap-1 text-sm font-black uppercase tracking-widest">
                {user && (
                  <>
                    <Link to="/membership" className={cn(navItemClass(location.pathname === '/membership'), "px-5 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all")}>Thành viên</Link>
                    <Link to="/my-tickets" className={cn(navItemClass(location.pathname === '/my-tickets'), "px-5 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all")}>Vé của tôi</Link>
                    <Link to="/feedback" className={cn(navItemClass(location.pathname === '/feedback'), "px-5 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all")}>Hỗ trợ</Link>
                  </>
                )}
                {user?.role === ROLES.ADMIN && (
                  <Link to="/admin/dashboard" className={cn(navItemClass(location.pathname.startsWith('/admin')), "px-5 py-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/10 rounded-full transition-all")}>
                    Quản trị
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex flex-1 items-center justify-end gap-6">
              <div className="hidden md:flex flex-1 items-center justify-center px-4 max-w-xl">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="w-full flex items-center bg-slate-50 dark:bg-white/5 rounded-2xl h-12 px-5 border border-slate-100 dark:border-white/5 group transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl hover:shadow-black/5 hover:border-brand-600/30"
                >
                  <Search className="h-4.5 w-4.5 text-slate-400 group-hover:text-brand-600 transition-colors mr-3" />
                  <span className="text-sm font-bold text-slate-400 dark:text-white/30 flex-1 text-left">Khám phá các sự kiện bùng nổ...</span>
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-400">
                    <span className="text-[12px]">⌘</span> K
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="h-11 w-11 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-indigo-400" />}
                </Button>

                {user && <NotificationBell />}

                {!user ? (
                  <Button onClick={() => navigate('/auth/login')} className="h-11 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-600/20 bg-brand-600 hover:bg-brand-700">
                    Đăng nhập
                  </Button>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="hidden xl:flex flex-col items-end leading-none">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{user.full_name || user.email.split('@')[0]}</span>
                      <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest mt-1.5">Membeship VIP</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-hidden hover:border-brand-600/50 hover:shadow-lg transition-all"
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
                        <div className="h-full w-full bg-gradient-to-br from-brand-600 to-emerald-400 flex items-center justify-center text-white font-black text-sm">
                          {(user.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 lg:hidden rounded-2xl bg-slate-50 dark:bg-white/5"
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

      <div className={cn("flex-1 flex flex-col min-h-0", isSeatMapPage && "h-screen overflow-hidden")}>
        <main className={
          isSeatMapPage ? 'w-full h-full min-h-0 flex flex-col overflow-hidden' :
          isStandalonePage ? 'w-full min-h-screen' : 
          'mx-auto w-full max-w-[1440px] px-4 md:px-6 py-12'
        }>
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
