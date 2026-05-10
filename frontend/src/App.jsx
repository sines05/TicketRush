import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes.jsx';
import { CATEGORY_ALL, CATEGORY_ALL_LABEL, CATEGORY_OPTIONS, getCategoryKey } from './constants/categories.js';
import { resolveMediaUrl } from './utils/media.js';
import { useAuth } from './hooks/useAuth.js';
import { ROLES } from './constants/roles.js';
import logoUrl from './assets/Logo1.png';
import { useEffect, useState } from 'react';
import HeroSlider from './components/home/HeroSlider.jsx';
import TrendingEvents from './components/home/TrendingEvents.jsx';
import notificationService from './services/notificationService.js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  Search, 
  User, 
  LogOut, 
  Moon, 
  Sun,
  Menu,
  X
} from "lucide-react";

const THEME_KEY = 'tr_theme';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const activeCategoryParam = new URLSearchParams(location.search).get('category');
  const activeCategoryKey = getCategoryKey(activeCategoryParam || '');
  const showHeroSlider = location.pathname === '/' && (!activeCategoryParam || !String(activeCategoryParam).trim() || activeCategoryKey === CATEGORY_ALL);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {!isAuthPage && (
        <header className="sticky top-0 z-50 w-full glass-surface glass-border border-b-0 shadow-lg shadow-black/5">
          <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between px-6 md:px-10 lg:px-14">
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
                <Link to="/booking/queue" className={navItemClass(location.pathname === '/booking/queue')}>
                  Hàng chờ
                </Link>
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
              <div className="hidden lg:flex w-full max-w-[280px] items-center space-x-2">
                <div className="relative w-full group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    type="search"
                    placeholder="Tìm sự kiện..."
                    className="pl-9 h-10 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all rounded-xl"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                  />
                </div>
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
            "fixed inset-0 z-[100] md:hidden transition-all duration-500",
            isMobileMenuOpen ? "visible" : "invisible"
          )}>
            {/* Backdrop */}
            <div 
              className={cn(
                "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500",
                isMobileMenuOpen ? "opacity-100" : "opacity-0"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Panel */}
            <div className={cn(
              "absolute right-0 top-0 h-full w-[300px] glass-surface glass-border border-y-0 border-r-0 p-8 shadow-2xl transition-transform duration-500 ease-out flex flex-col",
              isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}>
              <div className="flex items-center justify-between mb-10">
                <span className="font-extrabold text-xl tracking-tighter">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl">
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <div className="relative w-full mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm sự kiện..."
                  className="pl-9 h-11 bg-muted/30 border-none rounded-xl"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                />
              </div>

              <nav className="flex flex-col space-y-1 flex-1">
                <Link to="/booking/queue" className="px-4 py-3 text-base font-bold hover:text-primary hover:bg-primary/5 rounded-xl transition-all">Hàng chờ</Link>
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

      {location.pathname === '/' && (
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12">
            <nav className="flex items-center gap-1 overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {(() => {
                const params = new URLSearchParams(location.search);
                const active = params.get('category') || CATEGORY_ALL;

                function go(next) {
                  const p = new URLSearchParams(location.search);
                  if (!next || next === CATEGORY_ALL) p.delete('category');
                  else p.set('category', next);
                  const nextSearch = p.toString();
                  navigate({ pathname: '/', search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
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
        {showHeroSlider && (
          <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12 pt-6">
            <HeroSlider />
          </div>
        )}

        {showHeroSlider && (
          <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12 pt-8">
            <TrendingEvents />
          </div>
        )}

        <main className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12 py-8">
          <AppRoutes />
        </main>
      </div>

      {!isAuthPage && (
        <footer className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12 py-12">
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
                  <li><Link to="/booking/queue" className="text-sm text-muted-foreground hover:text-primary transition-colors">Hàng chờ</Link></li>
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
                <span className="text-xs text-muted-foreground">Demo UI (React)</span>
                <span className="text-xs text-muted-foreground">Ocean Breeze / Dark Amethyst</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
