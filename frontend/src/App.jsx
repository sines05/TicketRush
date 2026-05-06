import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes.jsx';
import { CATEGORY_ALL, CATEGORY_ALL_LABEL, CATEGORY_OPTIONS, getCategoryKey } from './constants/categories.js';
import { resolveMediaUrl } from './utils/media.js';
import Button from './components/common/Button.jsx';
import { useAuth } from './hooks/useAuth.js';
import { ROLES } from './constants/roles.js';
import logoUrl from './assets/Logo1.png';
import { useEffect, useState } from 'react';
import HeroSlider from './components/home/HeroSlider.jsx';
import TrendingEvents from './components/home/TrendingEvents.jsx';

const THEME_KEY = 'tr_theme';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [avatarFailed, setAvatarFailed] = useState(false);

  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');

  const themeLabel = theme === 'dark' ? 'Tối' : 'Sáng';

  const navItemClass =
    "relative rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-text/5 hover:text-text after:content-[''] after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-center after:scale-x-0 after:bg-current after:opacity-80 after:transition-transform after:duration-200 hover:after:scale-x-100";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

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
    <div className="min-h-screen">
      {!isAuthPage && (
        <header className="sticky top-0 z-20 border-b border-text/10 bg-bg/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 md:px-8 lg:px-12 py-4">
            <Link to="/" className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.02]">
      
              {/* Container của Logo */}
              <div className="relative flex items-center justify-center">
                {/* Hiệu ứng Glow tỏa sáng phía sau logo khi hover (rất xịn cho Dark Mode) */}
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 opacity-0 blur transition duration-500 group-hover:opacity-30 dark:group-hover:opacity-50"></div>
        
                {/* Logo chính: Bắt sáng nhẹ ở Dark Mode, shadow tinh tế ở Light Mode */}
                <img 
                  src={logoUrl} 
                  alt="TicketRush" 
                  className="relative h-[48px] w-[48px] object-contain drop-shadow-sm transition-all duration-300 dark:drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]" 
                />
              </div>

              {/* Phần Text */}
              <div className="flex flex-col justify-center">
                {/* 
                Chữ TicketRush: 
                - Sáng: Gradient Tím Đậm - Xanh Indigo 
                - Tối: Gradient Xanh Lam - Tím (như trang Login)
                */}
                <div className="text-lg font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-700 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
                  TicketRush
                </div>
        
                {/* Slogan: Thu nhỏ nhẹ, giãn chữ để trông sang hơn */}
                <div className="text-[11px] font-medium tracking-wide text-muted/80 transition-colors duration-300 group-hover:text-text/90">
                  Săn vé nhanh • Trải nghiệm mượt
                </div>
              </div>
      
            </Link>

            <nav className="flex items-center gap-2">
              <div className="hidden w-64 md:block">
                <input
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    const q = eventSearch.trim();
                    const params = new URLSearchParams();
                    if (q) params.set('q', q);
                    const nextSearch = params.toString();
                    navigate({ pathname: '/', search: nextSearch ? `?${nextSearch}` : '' });
                  }}
                  placeholder="Tìm sự kiện..."
                  className="h-9 w-full rounded-md border border-text/10 bg-surface px-3 text-sm text-text placeholder:text-muted/70 focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
                />
              </div>

              <Link
                to="/booking/queue"
                className={navItemClass}
              >
                Hàng chờ
              </Link>

              {user && (
                <Link
                  to="/my-tickets"
                  className={navItemClass}
                >
                  Vé của tôi
                </Link>
              )}

              {user?.role === ROLES.ADMIN && (
                <Link
                  to="/admin/dashboard"
                  className={navItemClass}
                >
                  Admin
                </Link>
              )}

              <div className="ml-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                  className="relative text-muted hover:text-text after:content-[''] after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-center after:scale-x-0 after:bg-current after:opacity-80 after:transition-transform after:duration-200 hover:after:scale-x-100"
                  aria-label={`Đổi giao diện: ${themeLabel}`}
                  title={`Giao diện: ${themeLabel}`}
                >
                  {theme === 'dark' ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2" />
                      <path d="M12 20v2" />
                      <path d="M4.93 4.93l1.41 1.41" />
                      <path d="M17.66 17.66l1.41 1.41" />
                      <path d="M2 12h2" />
                      <path d="M20 12h2" />
                      <path d="M6.34 17.66l-1.41 1.41" />
                      <path d="M19.07 4.93l-1.41 1.41" />
                    </svg>
                  )}
                </Button>
                {!user ? (
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/auth/login')}
                    size="sm"
                  >
                    Đăng nhập
                  </Button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('/profile')}
                      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-text/10 bg-bg/40 text-sm font-semibold text-text hover:bg-text/5"
                      aria-label="Hồ sơ cá nhân"
                      title="Hồ sơ cá nhân"
                    >
                      {user.avatar_url && !avatarFailed ? (
                        <img
                          src={resolveMediaUrl(user.avatar_url)}
                          alt="avatar"
                          className="h-full w-full object-cover"
                          onError={() => setAvatarFailed(true)}
                        />
                      ) : (
                        <span className="text-xs text-muted">
                          {String(user.full_name || user.email || 'U').trim().slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </button>

                    <span className="hidden text-sm text-muted sm:inline">{user.full_name || user.email}</span>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      size="sm"
                    >
                      Đăng xuất
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        </header>
      )}

      {location.pathname === '/' && (
        <div className="border-b border-text/10 bg-bg/80 backdrop-blur">
          <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12">
            {/* Thêm class ẩn thanh cuộn (scrollbar) để giao diện vuốt ngang nhìn mượt và sạch hơn */}
            <nav className="flex items-center gap-2 overflow-x-auto py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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

                // Nơi định nghĩa các class dùng chung cho mỗi nút danh mục
                const baseItemClass = "group relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors duration-300";

                return (
                  <>
                    {/* Nút "Tất cả" */}
                    <button 
                      type="button" 
                      onClick={() => go(CATEGORY_ALL)} 
                      className={`${baseItemClass} ${active === CATEGORY_ALL ? 'text-text font-semibold' : 'text-muted hover:text-text'}`}
                    >
                      {CATEGORY_ALL_LABEL}
                      
                      {/* Đường gạch chân khi đang Active (có màu gradient và phát sáng nhẹ) */}
                      {active === CATEGORY_ALL && (
                        <span className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-brand-600 to-brand-700 shadow-[0_-2px_8px_rgb(var(--tr-brand-600)/0.45)]"></span>
                      )}
                      {/* Đường gạch chân trượt mượt mà khi Hover (chỉ hiện khi chưa Active) */}
                      {active !== CATEGORY_ALL && (
                        <span className="absolute bottom-0 left-0 h-[2px] w-full origin-center scale-x-0 bg-text/30 transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
                      )}
                    </button>

                    {/* Vòng lặp các nút Danh mục còn lại */}
                    {CATEGORY_OPTIONS.map((c) => (
                      <button 
                        key={c.key} 
                        type="button" 
                        onClick={() => go(c.key)} 
                        className={`${baseItemClass} ${active === c.key ? 'text-text font-semibold' : 'text-muted hover:text-text'}`}
                      >
                        {c.label}

                        {/* Đường gạch chân khi đang Active */}
                        {active === c.key && (
                          <span className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-brand-600 to-brand-700 shadow-[0_-2px_8px_rgb(var(--tr-brand-600)/0.45)]"></span>
                        )}
                        {/* Đường gạch chân trượt khi Hover */}
                        {active !== c.key && (
                          <span className="absolute bottom-0 left-0 h-[2px] w-full origin-center scale-x-0 bg-text/30 transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
                        )}
                      </button>
                    ))}
                  </>
                );
              })()}
            </nav>
          </div>
        </div>
      )}

      {showHeroSlider && (
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12 pt-5">
          <HeroSlider />
        </div>
      )}

      {showHeroSlider && (
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12 pt-5">
          <TrendingEvents />
        </div>
      )}

      <main className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12 py-6">
        <AppRoutes />
      </main>

      {!isAuthPage && (
        <footer className="border-t border-text/10">
          <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12 py-6 text-xs text-muted">
            TicketRush • Demo UI (React) • Có hỗ trợ light/dark
          </div>
        </footer>
      )}
    </div>
  );
}
