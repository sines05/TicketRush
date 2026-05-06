import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Loading from '../../components/common/Loading.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { GENDER } from '../../constants/gender.js';
import userService from '../../services/userService.js';
import uploadService from '../../services/uploadService.js';
import { resolveMediaUrl } from '../../utils/media.js';

function toDateInputValue(value) {
  if (!value) return '';
  const str = String(value).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return '';

  const yyyy = date.getUTCFullYear();
  if (yyyy === 1) return '';
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function Profile() {
  const { user, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState(null);

  const [gender, setGender] = useState(user?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(toDateInputValue(user?.date_of_birth || ''));

  const [lastLoaded, setLastLoaded] = useState({
    email: user?.email || '',
    full_name: user?.full_name || '',
    avatar_url: user?.avatar_url || '',
    gender: user?.gender || '',
    date_of_birth: toDateInputValue(user?.date_of_birth || '')
  });

  const avatarPreview = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    const trimmed = String(avatarUrl || '').trim();
    return resolveMediaUrl(trimmed) || '';
  }, [avatarFile, avatarUrl]);

  useEffect(() => {
    if (!avatarFile) return;
    const url = avatarPreview;
    return () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    };
  }, [avatarFile, avatarPreview]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    userService
      .getMe()
      .then((me) => {
        if (!mounted) return;
        const next = {
          email: me?.email || user?.email || '',
          full_name: me?.full_name || user?.full_name || '',
          avatar_url: me?.avatar_url || user?.avatar_url || '',
          gender: me?.gender || user?.gender || '',
          date_of_birth: toDateInputValue(me?.date_of_birth || user?.date_of_birth || '')
        };
        setLastLoaded(next);
        setEmail(next.email);
        setFullName(next.full_name);
        setAvatarUrl(next.avatar_url);
        setGender(next.gender);
        setDateOfBirth(next.date_of_birth);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Không tải được hồ sơ');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.email, user?.full_name, user?.avatar_url, user?.gender, user?.date_of_birth]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const nextAvatarUrl = avatarFile ? await uploadService.uploadImage(avatarFile) : avatarUrl;

      const updated = await userService.updateMe({
        full_name: fullName,
        avatar_url: nextAvatarUrl,
        gender: gender || undefined,
        date_of_birth: dateOfBirth || undefined
      });

      updateUser?.({
        full_name: updated.full_name,
        avatar_url: updated.avatar_url,
        gender: updated.gender,
        date_of_birth: updated.date_of_birth
      });

      setAvatarUrl(updated.avatar_url || '');
      setAvatarFile(null);

      setGender(updated.gender || gender || '');
      setDateOfBirth(toDateInputValue(updated.date_of_birth || dateOfBirth || ''));

      setLastLoaded((prev) => ({
        ...prev,
        full_name: updated.full_name ?? fullName,
        avatar_url: updated.avatar_url ?? nextAvatarUrl,
        gender: updated.gender ?? (gender || ''),
        date_of_birth: toDateInputValue(updated.date_of_birth || dateOfBirth || '')
      }));

      setSuccess('Đã lưu thay đổi');
    } catch (e) {
      setError(e?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setError('');
    setSuccess('');
    setEmail(lastLoaded.email);
    setFullName(lastLoaded.full_name);
    setAvatarUrl(lastLoaded.avatar_url);
    setAvatarFile(null);
    setGender(lastLoaded.gender);
    setDateOfBirth(lastLoaded.date_of_birth);
  }

  if (loading) return <Loading title="Đang tải hồ sơ..." />;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Hồ sơ cá nhân</h1>
            <p className="mt-1 text-sm text-muted">Cập nhật thông tin tài khoản của bạn</p>
          </div>
          <Link to="/">
            <Button variant="secondary">Về sự kiện</Button>
          </Link>
        </div>

        {(error || success) && (
          <div
            className={`mt-4 rounded-xl border p-3 text-sm ${
              error ? 'border-danger/40 bg-danger/10' : 'border-success/40 bg-success/10'
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-text/10 bg-bg/40 p-4">
            <div className="text-sm font-semibold">Avatar</div>
            <div className="mt-4 flex items-center justify-center">
              <div className="h-44 w-44 overflow-hidden rounded-full border border-text/10 bg-bg/60">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted">No avatar</div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block">
                <div className="mb-1 text-sm text-muted">Chọn ảnh avatar</div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text file:mr-3 file:rounded-md file:border-0 file:bg-bg/60 file:px-3 file:py-2 file:text-sm file:text-text hover:file:bg-bg/70 focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-text/10 bg-bg/40 p-4 md:col-span-2">
            <div className="text-sm font-semibold">Thông tin</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="mb-1 text-sm text-muted">Email</div>
                <div className="rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text">
                  {email || '—'}
                </div>
              </div>

              <Input
                className="md:col-span-2"
                label="Họ và tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
              />

              <Input
                label="Ngày sinh"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />

              <label className="block">
                <div className="mb-1 text-sm text-muted">Giới tính</div>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-10 w-full rounded-md border border-text/10 bg-surface px-3 text-sm text-text focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
                >
                  <option value="">—</option>
                  <option value={GENDER.MALE}>Nam</option>
                  <option value={GENDER.FEMALE}>Nữ</option>
                  <option value={GENDER.OTHER}>Khác</option>
                </select>
              </label>

              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={handleCancel} disabled={saving}>
                  Hủy
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
