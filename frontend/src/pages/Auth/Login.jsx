import { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LockKeyhole, ShieldCheck, Sparkles, Ticket } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { ROLES } from '../../constants/roles.js';
import authService from '../../services/authService.js';
import logoPng from '../../assets/Logo1.png';

const fieldClass = 'h-12 w-full rounded-2xl border border-cyan-700/15 bg-white/70 px-4 text-base font-semibold text-slate-950 shadow-inner shadow-cyan-900/5 outline-none transition placeholder:text-slate-400 focus:border-amber-400/70 focus:bg-white focus:ring-4 focus:ring-amber-300/20 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/35 dark:focus:border-cyan-300/70 dark:focus:bg-white/[0.14] dark:focus:ring-cyan-300/15';
const labelClass = 'mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-slate-600 dark:text-cyan-100/75';

function AuthField({ label, error, ...props }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        className={`${fieldClass} ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500/50' : ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-400">{error}</p>}
    </label>
  );
}

function BrandPanel() {
  return (
    <section className="relative hidden overflow-hidden rounded-[2rem] border border-white/60 bg-slate-950 p-8 text-white shadow-[0_28px_90px_-45px_rgba(8,47,73,.9)] dark:border-white/10 lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(251,191,36,.38),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(20,184,166,.32),transparent_30%),linear-gradient(145deg,rgba(15,23,42,.88),rgba(8,47,73,.78))]" />
      <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl" />
      <div className="relative z-10 flex min-h-[560px] flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/14 ring-1 ring-white/20">
            <Ticket className="h-7 w-7 text-amber-200" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight">TicketRush</div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100/75">Premium entry desk</div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/12 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-100">
            <Sparkles className="h-4 w-4" />
            Fast ticket access
          </div>
          <h2 className="max-w-xl text-5xl font-black leading-[0.95] tracking-tight">
            Vào sự kiện nhanh, giữ ghế gọn, thanh toán rõ ràng.
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {['Queue token', 'Seat lock', 'QR ticket'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <ShieldCheck className="mb-3 h-5 w-5 text-cyan-200" />
                <div className="text-sm font-black">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, verify2FA } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(location.state?.error || '');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [requires2FA, setRequires2FA] = useState(() => {
    return !!window.sessionStorage.getItem('2fa_pending_token');
  });
  const [twoFACode, setTwoFACode] = useState('');
  const [pendingToken, setPendingToken] = useState(() => {
    return window.sessionStorage.getItem('2fa_pending_token') || '';
  });

  useEffect(() => {
    const urlToken = searchParams.get('pending_token');
    if (urlToken) {
      setRequires2FA(true);
      setPendingToken(urlToken);
      window.sessionStorage.setItem('2fa_pending_token', urlToken);
    }
  }, [searchParams]);

  const from = useMemo(() => location.state?.from || '/', [location.state]);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    }
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validate()) return;

    setLoading(true);

    try {
      const result = await login({ email, password });
      handleLoginSuccess(result);
    } catch (err) {
      if (err?.errorCode === '2FA_REQUIRED') {
        const token = err.data?.pending_token;
        setRequires2FA(true);
        setPendingToken(token);
        window.sessionStorage.setItem('2fa_pending_token', token);
      } else if (err?.requires_2fa) {
        setRequires2FA(true);
        setPendingToken(err.pending_token);
        window.sessionStorage.setItem('2fa_pending_token', err.pending_token);
      } else {
        if (err?.details) {
          setFieldErrors(err.details);
        }
        setError(err?.message || 'Đăng nhập thất bại');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handle2FASubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!twoFACode) {
      setFieldErrors({ code: 'Vui lòng nhập mã xác thực' });
      return;
    }

    setLoading(true);

    try {
      const result = await verify2FA(pendingToken, twoFACode);
      window.sessionStorage.removeItem('2fa_pending_token');
      handleLoginSuccess(result);
    } catch (err) {
      if (err?.details) {
        setFieldErrors(err.details);
      }
      setError(err?.message || 'Mã xác thực không chính xác');
    } finally {
      setLoading(false);
    }
  }

  function handleLoginSuccess(result) {
    if (result.user.role === ROLES.ADMIN) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    navigate(from, { replace: true });
  }

  const handleBackToLogin = () => {
    setRequires2FA(false);
    setPendingToken('');
    window.sessionStorage.removeItem('2fa_pending_token');
  };

  const handleSocialLogin = (provider) => {
    authService.socialLogin(provider);
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(251,191,36,.25),transparent_26%),radial-gradient(circle_at_86%_18%,rgba(20,184,166,.24),transparent_28%),linear-gradient(135deg,#f8fafc_0%,#ecfeff_46%,#fff7ed_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_10%_12%,rgba(251,191,36,.18),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(45,212,191,.18),transparent_30%),linear-gradient(135deg,#12091f_0%,#082f49_48%,#171717_100%)]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <BrandPanel />

        <section className="relative mx-auto w-full max-w-[480px] rounded-[2rem] border border-white/70 bg-white/76 p-6 shadow-[0_24px_90px_-48px_rgba(8,47,73,.9)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.08] sm:p-8">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-cyan-300/30 blur-2xl dark:bg-cyan-200/20" />
              <img src={logoPng} alt="TicketRush" className="relative h-24 w-24 object-contain drop-shadow-xl" />
            </div>
            <div className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white">TicketRush</div>
            <div className="mt-1.5 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-800 dark:text-cyan-100">Săn vé nhanh - Trải nghiệm mượt</div>
          </div>

          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-300/20 text-amber-700 dark:bg-amber-200/12 dark:text-amber-200">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{requires2FA ? 'XÁC THỰC 2 LỚP' : 'SIGN IN'}</h1>
              {!requires2FA && (
                <p className="mt-1 text-sm font-medium text-slate-600 dark:text-cyan-100/70">
                  Email có chữ <span className="font-black text-amber-700 dark:text-amber-200">admin</span> sẽ vào role ADMIN.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger dark:text-rose-100">{error}</div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-2xl border border-emerald-400/40 bg-emerald-400/12 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-100">{successMessage}</div>
          )}

          {requires2FA ? (
            <form className="space-y-4" onSubmit={handle2FASubmit}>
              <p className="text-sm text-slate-600 dark:text-cyan-100/70">Vui lòng nhập mã xác thực từ ứng dụng Authenticator của bạn.</p>
              <AuthField
                label="Mã xác thực (OTP)"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                placeholder="123456"
                autoFocus
                error={fieldErrors.code}
              />
              <Button className="h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-amber-500 font-black shadow-lg shadow-cyan-700/20 hover:brightness-110" type="submit" disabled={loading}>
                {loading ? 'Đang xác thực...' : 'Xác nhận'}
              </Button>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full text-sm font-bold text-cyan-700 hover:underline dark:text-cyan-200"
              >
                Quay lại đăng nhập
              </button>
            </form>
          ) : (
            <>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <AuthField
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  error={fieldErrors.email}
                />
                <AuthField
                  label="Mật khẩu"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  autoComplete="current-password"
                  error={fieldErrors.password}
                />

                <div className="flex justify-end">
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs font-bold text-cyan-700 hover:underline dark:text-cyan-200"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>

                <Button className="h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-amber-500 font-black shadow-lg shadow-cyan-700/20 hover:brightness-110" type="submit" disabled={loading}>
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-900/10 dark:border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="rounded-full bg-white/80 px-3 py-1 font-black tracking-[0.16em] text-slate-500 dark:bg-slate-950/60 dark:text-cyan-100/60">Hoặc đăng nhập với</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-900/10 bg-white/70 px-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('facebook')}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-900/10 bg-white/70 px-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </button>
                </div>
              </div>

              <div className="mt-6 text-center text-sm font-semibold text-slate-600 dark:text-cyan-100/70">
                Chưa có tài khoản?{' '}
                <Link className="font-black text-cyan-700 hover:underline dark:text-amber-200" to="/auth/register">
                  Sign up
                </Link>
              </div>

              <div className="mt-2 text-center">
                <Link to="/" className="text-xs font-bold text-slate-500 hover:underline dark:text-cyan-100/55">
                  Về trang chủ
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
