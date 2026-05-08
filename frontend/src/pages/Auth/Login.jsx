import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { ROLES } from '../../constants/roles.js';
import authService from '../../services/authService.js';
import logoPng from '../../assets/Logo1.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verify2FA } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(() => {
    return !!window.sessionStorage.getItem('2fa_user_id');
  });
  const [twoFACode, setTwoFACode] = useState('');
  const [userId, setUserId] = useState(() => {
    return window.sessionStorage.getItem('2fa_user_id') || '';
  });

  const from = useMemo(() => location.state?.from || '/', [location.state]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login({ email, password });
      handleLoginSuccess(result);
    } catch (err) {
      if (err?.requires_2fa) {
        setRequires2FA(true);
        setUserId(err.user_id);
        window.sessionStorage.setItem('2fa_user_id', err.user_id);
      } else {
        setError(err?.message || 'Đăng nhập thất bại');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handle2FASubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await verify2FA(userId, twoFACode);
      window.sessionStorage.removeItem('2fa_user_id');
      handleLoginSuccess(result);
    } catch (err) {
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
    setUserId('');
    window.sessionStorage.removeItem('2fa_user_id');
  };

  const handleSocialLogin = (provider) => {
    authService.socialLogin(provider);
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-text/10 bg-surface p-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoPng} alt="TicketRush" className="h-24 w-24 object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.5)] drop-shadow-md" />
          <div className="mt-4 text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-brand-700 to-accent">TicketRush</div>
          <div className="mt-1.5 text-sm font-medium text-muted/80 tracking-wide">Săn vé nhanh • Trải nghiệm mượt</div>
        </div>

        <h1 className="text-lg font-semibold">{requires2FA ? 'XÁC THỰC 2 LỚP' : 'SIGN IN'}</h1>
        {!requires2FA && (
          <p className="mt-1 text-sm text-muted">
            Email có chữ <span className="font-semibold">admin</span> sẽ vào role ADMIN.
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">{error}</div>
        )}

        {requires2FA ? (
          <form className="mt-5 space-y-4" onSubmit={handle2FASubmit}>
            <p className="text-sm text-muted">Vui lòng nhập mã xác thực từ ứng dụng Authenticator của bạn.</p>
            <Input
              label="Mã xác thực (OTP)"
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value)}
              placeholder="123456"
              autoFocus
            />
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Xác nhận'}
            </Button>
            <button
              type="button"
              onClick={handleBackToLogin}
              className="w-full text-sm text-brand-700 hover:underline"
            >
              Quay lại đăng nhập
            </button>
          </form>
        ) : (
          <>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              <Input
                label="Mật khẩu"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-text/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface px-2 text-muted">Hoặc đăng nhập với</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSocialLogin('google')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-text/10 bg-surface px-4 py-2 text-sm font-medium hover:bg-text/5"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </button>
                <button
                  onClick={() => handleSocialLogin('facebook')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-text/10 bg-surface px-4 py-2 text-sm font-medium hover:bg-text/5"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </button>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-muted">
              Chưa có tài khoản?{' '}
              <Link className="text-brand-700 hover:underline" to="/auth/register">
                Sign up
              </Link>
            </div>

            <div className="mt-2 text-center">
              <Link to="/" className="text-xs text-muted hover:underline">
                Về trang chủ
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
