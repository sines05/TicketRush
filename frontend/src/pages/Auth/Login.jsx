import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { ROLES } from '../../constants/roles.js';
import logoPng from '../../assets/Logo1.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = useMemo(() => location.state?.from || '/', [location.state]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login({ email, password });
      if (result.user.role === ROLES.ADMIN) {
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-text/10 bg-surface p-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoPng} alt="TicketRush" className="h-24 w-24 object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.5)] drop-shadow-md" />
          <div className="mt-4 text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">TicketRush</div>
          <div className="mt-1.5 text-sm font-medium text-muted/80 tracking-wide">Săn vé nhanh • Trải nghiệm mượt</div>
        </div>

        <h1 className="text-lg font-semibold">SIGN IN</h1>
        <p className="mt-1 text-sm text-muted">
          Email có chữ <span className="font-semibold">admin</span> sẽ vào role ADMIN.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">{error}</div>
        )}

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

          <div className="text-center text-sm text-muted">
            Chưa có tài khoản?{' '}
            <Link className="text-brand-700 hover:underline" to="/auth/register">
              Sign up
            </Link>
          </div>

          <div className="text-center">
            <Link to="/" className="text-xs text-muted hover:underline">
              Về trang chủ
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
