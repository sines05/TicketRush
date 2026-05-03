import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import authService from '../../services/authService.js';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [done, setDone] = useState(false);

  const hasToken = useMemo(() => Boolean(String(resetToken || '').trim()), [resetToken]);

  async function handleRequest(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    setDone(false);

    try {
      const result = await authService.forgotPassword({ email });
      if (result?.reset_token) {
        setResetToken(result.reset_token);
        setInfo('Token đặt lại mật khẩu đã được tạo (demo).');
      } else {
        setInfo('Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.');
      }
    } catch (err) {
      setError(err?.message || 'Không gửi được yêu cầu');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      await authService.resetPassword({ reset_token: resetToken, new_password: newPassword });
      setDone(true);
      setInfo('Đặt lại mật khẩu thành công.');
      setTimeout(() => navigate('/auth/login'), 600);
    } catch (err) {
      setError(err?.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-text/10 bg-surface p-6">
        <h1 className="text-lg font-semibold">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-muted">
          Nhập email để tạo yêu cầu đặt lại mật khẩu. (Demo: hệ thống trả về reset token)
        </p>

        {(error || info) && (
          <div
            className={`mt-4 rounded-xl border p-3 text-sm ${
              error ? 'border-danger/40 bg-danger/10' : 'border-text/10 bg-bg/40'
            }`}
          >
            {error || info}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleRequest}>
          <Input
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </Button>
        </form>

        <div className="mt-6 border-t border-text/10 pt-5">
          <div className="text-sm font-semibold">Đặt lại mật khẩu</div>
          <p className="mt-1 text-sm text-muted">Dán reset token và nhập mật khẩu mới.</p>

          <form className="mt-4 space-y-4" onSubmit={handleReset}>
            <Input
              label="Reset token"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder={hasToken ? '' : 'Nhấn "Gửi yêu cầu" để nhận token demo'}
              autoComplete="off"
            />
            <Input
              label="Mật khẩu mới"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <Button className="w-full" type="submit" disabled={loading || done}>
              {loading ? 'Đang đặt lại...' : done ? 'Đã xong' : 'Đặt lại mật khẩu'}
            </Button>
          </form>
        </div>

        <div className="mt-5 text-center">
          <Link to="/auth/login" className="text-sm text-brand-700 hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
