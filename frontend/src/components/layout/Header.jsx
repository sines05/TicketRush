import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROLES } from '../../constants/roles.js';
import logoUrl from '../../assets/Logo1.png';
import { resolveMediaUrl } from '../../utils/media.js';
import { Button } from "@/components/ui/button";
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

export default function Header({
  user,
  logout,
  theme,
  setTheme,
  isSearchOpen,
  setIsSearchOpen,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  avatarFailed,
  setAvatarFailed,
  eventSearch,
  setEventSearch
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItemClass = (isActive) => cn(
    "relative px-3 py-2 text-sm font-medium transition-colors hover:text-white/80",
    isActive ? "text-white" : "text-white/70"
  );

  const pillButtonClass = "px-4 py-1.5 rounded-full border border-white text-white text-sm font-bold hover:bg-white hover:text-primary transition-all whitespace-nowrap";

  return (
    <header className="sticky top-0 z-50 w-full bg-primary shadow-lg">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 md:px-10 lg:px-14">
        <div className="flex items-center gap-4 md:gap-10">
          <Link to="/" className="flex items-center space-x-3 transition-all hover:scale-[1.03] active:scale-95">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-inner">
              <img src={logoUrl} alt="TicketRush" className="h-7 w-7 object-contain brightness-0 invert" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl leading-none tracking-tighter text-white">
                TicketRush
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 leading-none mt-1.5 hidden sm:block">
                Premium Ticketing
              </span>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center space-x-2 xl:space-x-4 text-sm font-bold">
            {user && (
              <>
                <Link to="/my-tickets" className={pillButtonClass}>Vé của tôi</Link>
                {user.role === ROLES.ADMIN && (
                  <Link to="/admin/events/new" className={cn(pillButtonClass, "hidden xl:block")}>Tạo sự kiện</Link>
                )}
                <Link to="/membership" className={cn(navItemClass(location.pathname === '/membership'), "hidden xl:block")}>Thành viên</Link>
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

        <div className="flex flex-1 items-center justify-end space-x-2 md:space-x-5">
          <div className="hidden lg:flex flex-1 items-center justify-center px-4">
            <div className="relative w-full max-w-[500px] flex items-center">
              <div className="absolute left-4 text-gray-400">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Bạn tìm gì hôm nay?"
                className="w-full bg-white rounded-full h-11 pl-12 pr-28 text-sm text-gray-900 focus:outline-none shadow-sm"
              />
              <button className="absolute right-1.5 bg-primary hover:bg-primary/90 text-white px-5 py-1.5 rounded-full text-sm font-bold transition-colors">
                Tìm kiếm
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              className="h-10 w-10 lg:hidden rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white"
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-white" />}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {!user ? (
              <Button variant="secondary" size="sm" onClick={() => navigate('/auth/login')} className="rounded-full px-6 font-bold shadow-lg">
                Đăng nhập
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end text-white">
                  <span className="text-xs font-bold leading-none">{user.full_name || user.email.split('@')[0]}</span>
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-tighter leading-none mt-1">{user.role}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl border-2 border-white/20 bg-white/10 overflow-hidden hover:border-white/40 transition-all"
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
                    <User className="h-5 w-5 text-white" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:hidden rounded-xl bg-white/10 text-white"
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
  );
}
