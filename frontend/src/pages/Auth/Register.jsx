import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, CalendarDays, Sparkles, Ticket, UserRoundPlus } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import { GENDER } from '../../constants/gender.js';
import { useAuth } from '../../hooks/useAuth.js';
import logoPng from '../../assets/Logo1.png';

const fieldClass = 'h-12 w-full rounded-2xl border border-cyan-700/15 bg-white/70 px-4 text-base font-semibold text-slate-950 shadow-inner shadow-cyan-900/5 outline-none transition placeholder:text-slate-400 focus:border-amber-400/70 focus:bg-white focus:ring-4 focus:ring-amber-300/20 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/35 dark:focus:border-cyan-300/70 dark:focus:bg-white/[0.14] dark:focus:ring-cyan-300/15';
const labelClass = 'mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-slate-600 dark:text-cyan-100/75';

function AuthField({ label, ...props }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input className={fieldClass} {...props} />
    </label>
  );
}

function RegisterBrandPanel() {
  return (
    <section className="relative hidden overflow-hidden rounded-[2rem] border border-white/60 bg-slate-950 p-8 text-white shadow-[0_28px_90px_-45px_rgba(8,47,73,.9)] dark:border-white/10 lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(20,184,166,.36),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(251,191,36,.30),transparent_30%),linear-gradient(145deg,rgba(8,47,73,.9),rgba(39,39,42,.8))]" />
      <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-cyan-300/22 blur-3xl" />
      <div className="relative z-10 flex min-h-[620px] flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/14 ring-1 ring-white/20">
            <Ticket className="h-7 w-7 text-cyan-200" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight">TicketRush</div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-amber-100/75">New account gate</div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-200/12 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
            <Sparkles className="h-4 w-4" />
            Member ready
          </div>
          <h2 className="max-w-xl text-5xl font-black leading-[0.95] tracking-tight">
            Tạo tài khoản mới để giữ vé và quản lý QR nhanh hơn.
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Profile', UserRoundPlus],
              ['Birthday', CalendarDays],
              ['Access', BadgeCheck],
            ].map(([item, Icon]) => (
              <div key={item} className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <Icon className="mb-3 h-5 w-5 text-amber-200" />
                <div className="text-sm font-black">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState(GENDER.MALE);
  const [dateOfBirth, setDateOfBirth] = useState('2000-12-25');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        email,
        password,
        full_name: fullName,
        gender,
        date_of_birth: dateOfBirth
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(20,184,166,.24),transparent_26%),radial-gradient(circle_at_86%_18%,rgba(251,191,36,.25),transparent_28%),linear-gradient(135deg,#f8fafc_0%,#f0fdfa_46%,#fff7ed_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_10%_12%,rgba(45,212,191,.18),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(251,191,36,.17),transparent_30%),linear-gradient(135deg,#082f49_0%,#12091f_52%,#171717_100%)]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <RegisterBrandPanel />

        <section className="relative mx-auto w-full max-w-[480px] rounded-[2rem] border border-white/70 bg-white/76 p-6 shadow-[0_24px_90px_-48px_rgba(8,47,73,.9)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.08] sm:p-8">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-amber-300/30 blur-2xl dark:bg-amber-200/18" />
              <img src={logoPng} alt="TicketRush" className="relative h-24 w-24 object-contain drop-shadow-xl" />
            </div>
            <div className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white">TicketRush</div>
            <div className="mt-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-800 dark:text-amber-100">Săn vé nhanh - Trải nghiệm mượt</div>
          </div>

          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300/20 text-cyan-700 dark:bg-cyan-200/12 dark:text-cyan-200">
              <UserRoundPlus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">SIGN UP</h1>
              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-cyan-100/70">Tạo hồ sơ để đặt vé và nhận mã QR.</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-400/40 bg-rose-400/12 p-3 text-sm font-semibold text-rose-700 dark:text-rose-100">{error}</div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <AuthField
              label="Họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              autoComplete="name"
            />
            <AuthField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            <AuthField
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              autoComplete="new-password"
            />

            <label className="block">
              <span className={labelClass}>Giới tính</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={fieldClass}
              >
                <option value={GENDER.MALE}>MALE</option>
                <option value={GENDER.FEMALE}>FEMALE</option>
                <option value={GENDER.OTHER}>OTHER</option>
              </select>
            </label>

            <AuthField
              label="Ngày sinh"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              autoComplete="bday"
            />

            <Button className="h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-amber-500 font-black shadow-lg shadow-cyan-700/20 hover:brightness-110" type="submit" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>

            <div className="text-center text-sm font-semibold text-slate-600 dark:text-cyan-100/70">
              Đã có tài khoản?{' '}
              <Link className="font-black text-cyan-700 hover:underline dark:text-amber-200" to="/auth/login">
                Sign in
              </Link>
            </div>

            <div className="text-center">
              <Link to="/" className="text-xs font-bold text-slate-500 hover:underline dark:text-cyan-100/55">
                Về trang chủ
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
