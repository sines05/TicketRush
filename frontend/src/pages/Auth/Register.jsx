import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { GENDER } from '../../constants/gender.js';
import { useAuth } from '../../hooks/useAuth.js';
import logoPng from '../../assets/Logo1.png';

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
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-text/10 bg-surface p-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoPng} alt="TicketRush" className="h-24 w-24 object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.5)] drop-shadow-md" />
          <div className="mt-4 text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-brand-700 to-accent">TicketRush</div>
          <div className="mt-1.5 text-sm font-medium text-muted/80 tracking-wide">Săn vé nhanh • Trải nghiệm mượt</div>
        </div>

        <h1 className="text-lg font-semibold">SIGN UP</h1>
        

        {error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">{error}</div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Họ và tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
          />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          <label className="block">
            <div className="mb-1 text-sm text-muted">Giới tính</div>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
            >
              <option value={GENDER.MALE}>MALE</option>
              <option value={GENDER.FEMALE}>FEMALE</option>
              <option value={GENDER.OTHER}>OTHER</option>
            </select>
            
          </label>

          <Input
            label="Ngày sinh"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            autoComplete="bday"
          />

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </Button>

          <div className="text-center text-sm text-muted">
            Đã có tài khoản?{' '}
            <Link className="text-brand-700 hover:underline" to="/auth/login">
              Sign in
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
