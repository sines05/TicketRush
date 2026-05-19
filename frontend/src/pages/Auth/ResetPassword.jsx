import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LockKeyhole, ShieldCheck, Sparkles, Ticket } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
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
            Secure reset
          </div>
          <h2 className="max-w-xl text-5xl font-black leading-[0.95] tracking-tight">
            Khôi phục mật khẩu an toàn và nhanh chóng.
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {['SHA-256', 'One-time token', 'Auto-expiry'].map((item) => (
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

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const validate = () => {
    const errors = {};
    if (!token) errors.token = 'Token là bắt buộc';
    if (newPassword.length < 8) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    if (newPassword !== confirmPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');
    
    try {
      await authService.resetPassword({ reset_token: token, new_password: newPassword });
      setSuccess('Đặt lại mật khẩu thành công! Bạn đang được chuyển hướng...');
      setTimeout(() => navigate('/auth/login'), 2000);
    } catch (err) {
      setError(err?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(251,191,36,.25),transparent_26%),radial-gradient(circle_at_86%_18%,rgba(20,184,166,.24),transparent_28%),linear-gradient(135deg,#f8fafc_0%,#ecfeff_46%,#fff7ed_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_10%_12%,rgba(251,191,36,.18),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(45,212,191,.18),transparent_30%),linear-gradient(135deg,#12091f_0%,#082f49_48%,#171717_100%)]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <BrandPanel />

        <section className="relative mx-auto w-full max-w-[480px] rounded-[2rem] border border-white/70 bg-white/76 p-6 shadow-[0_24px_90px_-48px_rgba(8,47,73,.9)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.08] sm:p-8">
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="relative">
              <img src={logoPng} alt="TicketRush" className="relative h-24 w-24 object-contain drop-shadow-xl" />
            </div>
            <div className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Đặt lại mật khẩu</div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-400/40 bg-rose-400/12 p-3 text-sm font-semibold text-rose-700 dark:text-rose-100">{error}</div>
          )}
          {success && (
            <div className="mb-4 rounded-2xl border border-emerald-400/40 bg-emerald-400/12 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-100">{success}</div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <AuthField
              label="Reset Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Nhập mã từ email"
              error={fieldErrors.token}
            />
            <AuthField
              label="Mật khẩu mới"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="********"
              error={fieldErrors.password}
            />
            <AuthField
              label="Xác nhận mật khẩu"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="********"
              error={fieldErrors.confirmPassword}
            />

            <Button className="h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-amber-500 font-black shadow-lg shadow-cyan-700/20 hover:brightness-110" type="submit" disabled={loading || success}>
              {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/auth/login" className="text-sm font-bold text-cyan-700 hover:underline dark:text-cyan-200">
              Quay lại đăng nhập
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
