import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { GENDER } from '../../constants/gender.js';
import userService from '../../services/userService.js';
import uploadService from '../../services/uploadService.js';
import authService from '../../services/authService.js';
import ticketService from '../../services/ticketService.js';
import { resolveMediaUrl } from '../../utils/media.js';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Loading from '../../components/common/Loading.jsx';
import TicketItem from '../../components/tickets/TicketItem.jsx';
import { User, Shield, Ticket, LogOut, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

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
  const { user, updateUser, logout } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile state
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [gender, setGender] = useState(user?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(toDateInputValue(user?.date_of_birth || ''));

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is_2fa_enabled || false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [twoFAData, setTwoFAData] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const [lastLoaded, setLastLoaded] = useState({
    email: user?.email || '',
    full_name: user?.full_name || '',
    avatar_url: user?.avatar_url || '',
    gender: user?.gender || '',
    date_of_birth: toDateInputValue(user?.date_of_birth || ''),
    is_2fa_enabled: user?.is_2fa_enabled || false,
    is_oauth: user?.is_oauth || false
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
          date_of_birth: toDateInputValue(me?.date_of_birth || user?.date_of_birth || ''),
          is_2fa_enabled: me?.is_2fa_enabled || false,
          is_oauth: me?.is_oauth || false
        };
        setLastLoaded(next);
        setEmail(next.email);
        setFullName(next.full_name);
        setAvatarUrl(next.avatar_url);
        setGender(next.gender);
        setDateOfBirth(next.date_of_birth);
        setIs2FAEnabled(next.is_2fa_enabled);
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
    // Re-fetch on every navigation to this page
  }, [location.key, user?.email, user?.full_name, user?.avatar_url, user?.gender, user?.date_of_birth]);

  useEffect(() => {
    setTicketsLoading(true);
    ticketService.getMyTickets()
      .then(data => setTickets(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setTicketsLoading(false));
  }, []);

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

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setChangingPassword(true);
    setError('');
    setSuccess('');

    try {
      await userService.changePassword({
        old_password: oldPassword,
        new_password: newPassword
      });
      setSuccess('Đổi mật khẩu thành công');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setError(e?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSetup2FA() {
    setTwoFALoading(true);
    setError('');
    try {
      const data = await authService.setup2FA();
      setTwoFAData(data);
      setShow2FASetup(true);
    } catch (e) {
      setError(e?.message || 'Không thể thiết lập 2FA');
    } finally {
      setTwoFALoading(false);
    }
  }

  async function handleEnable2FA() {
    setTwoFALoading(true);
    setError('');
    try {
      await authService.enable2FA(twoFACode);
      setIs2FAEnabled(true);
      setShow2FASetup(false);
      setTwoFAData(null);
      setTwoFACode('');
      setSuccess('Đã kích hoạt 2FA thành công');
      updateUser?.({ is_2fa_enabled: true });
    } catch (e) {
      setError(e?.message || 'Mã xác thực không chính xác');
    } finally {
      setTwoFALoading(false);
    }
  }

  async function handleDisable2FA() {
    setTwoFALoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.disable2FA(twoFACode);
      setIs2FAEnabled(false);
      setShow2FADisable(false);
      setTwoFACode('');
      setSuccess('Đã tắt xác thực 2 lớp thành công');
      updateUser?.({ is_2fa_enabled: false });
    } catch (e) {
      setError(e?.message || 'Mã xác thực không chính xác hoặc không thể tắt 2FA');
    } finally {
      setTwoFALoading(false);
    }
  }

  if (loading) return <Loading title="Đang tải hồ sơ..." />;

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bảng điều khiển</h1>
          <p className="text-muted-foreground">Quản lý tài khoản, vé và bảo mật của bạn.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/">Về trang chủ</Link>
          </Button>
          <Button variant="destructive" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      </div>

      {(error || success) && (
        <Alert variant={error ? "destructive" : "default"} className={success ? "border-green-500 bg-green-50 dark:bg-green-900/10" : ""}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
          <AlertTitle>{error ? "Lỗi" : "Thành công"}</AlertTitle>
          <AlertDescription>{error || success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" /> <span className="hidden sm:inline">Hồ sơ</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" /> <span className="hidden sm:inline">Vé của tôi</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> <span className="hidden sm:inline">Bảo mật</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Ảnh đại diện</CardTitle>
                <CardDescription>Ảnh này sẽ được hiển thị trên hồ sơ của bạn.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <Avatar className="h-40 w-40 border-4 border-background shadow-xl">
                    <AvatarImage src={avatarPreview} className="object-cover" />
                    <AvatarFallback className="text-4xl">{fullName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                    <Camera className="h-5 w-5" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                {avatarFile && (
                  <p className="text-xs text-muted-foreground">Đã chọn: {avatarFile.name}</p>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>Cập nhật thông tin cơ bản của bạn.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} disabled className="bg-muted" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dob">Ngày sinh</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gender">Giới tính</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={GENDER.MALE}>Nam</SelectItem>
                        <SelectItem value={GENDER.FEMALE}>Nữ</SelectItem>
                        <SelectItem value={GENDER.OTHER}>Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>Hủy</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vé của tôi</CardTitle>
              <CardDescription>Danh sách các vé bạn đã mua và mã QR để check-in.</CardDescription>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="flex justify-center py-12">
                  <Loading title="Đang tải vé..." />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Ticket className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Bạn chưa có vé nào</p>
                    <p className="text-sm text-muted-foreground">Hãy khám phá các sự kiện và đặt vé ngay.</p>
                  </div>
                  <Button asChild>
                    <Link to="/">Khám phá sự kiện</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {tickets.map((t) => (
                    <TicketItem key={t.ticket_id} ticket={t} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {lastLoaded.is_oauth ? (
            <Card>
              <CardHeader>
                <CardTitle>Đổi mật khẩu</CardTitle>
                <CardDescription>Quản lý mật khẩu của bạn.</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Tài khoản liên kết</AlertTitle>
                  <AlertDescription>
                    Tài khoản của bạn được liên kết với một nhà cung cấp dịch vụ bên thứ ba (Google, Facebook, v.v.).
                    Bạn không cần mật khẩu riêng cho TicketRush.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Đổi mật khẩu</CardTitle>
                <CardDescription>Cập nhật mật khẩu của bạn để bảo vệ tài khoản.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="oldPassword">Mật khẩu hiện tại</Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">Mật khẩu mới</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword}
                >
                  {changingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </Button>
              </CardFooter>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Bảo mật tài khoản</CardTitle>
              <CardDescription>Tăng cường bảo mật cho tài khoản của bạn với xác thực 2 lớp.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <p className="font-medium">Xác thực 2 lớp (2FA)</p>
                  <p className="text-sm text-muted-foreground">Sử dụng ứng dụng Authenticator để lấy mã xác thực khi đăng nhập.</p>
                </div>
                  {is2FAEnabled ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-green-600 font-medium text-sm">
                        <CheckCircle2 className="h-4 w-4" /> Đang bật
                      </div>
                      {!show2FADisable && (
                        <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => setShow2FADisable(true)} disabled={twoFALoading}>
                          Tắt bảo mật 2 lớp
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="text-muted-foreground font-medium text-sm">Đang tắt</div>
                      {!show2FASetup && (
                        <Button size="sm" onClick={handleSetup2FA} disabled={twoFALoading}>
                          Thiết lập 2FA
                        </Button>
                      )}
                    </div>
                  )}
              </div>

              {show2FADisable && (
                <div className="pt-6 border-t space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Cảnh báo bảo mật</AlertTitle>
                    <AlertDescription>
                      Việc tắt xác thực 2 lớp sẽ làm giảm tính bảo mật của tài khoản. Vui lòng nhập mã xác thực từ ứng dụng của bạn để xác nhận.
                    </AlertDescription>
                  </Alert>
                  <div className="max-w-sm space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="disable-2fa-code">Mã xác thực (6 số)</Label>
                      <Input
                        id="disable-2fa-code"
                        value={twoFACode}
                        onChange={(e) => setTwoFACode(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="destructive" className="flex-1" onClick={handleDisable2FA} disabled={twoFALoading || !twoFACode}>
                        {twoFALoading ? 'Đang xử lý...' : 'Xác nhận tắt 2FA'}
                      </Button>
                      <Button variant="outline" onClick={() => { setShow2FADisable(false); setTwoFACode(''); }}>Hủy</Button>
                    </div>
                  </div>
                </div>
              )}

              {show2FASetup && twoFAData && (
                <div className="grid gap-8 md:grid-cols-2 pt-6 border-t">
                  <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-white rounded-xl border">
                    <QRCodeCanvas value={twoFAData.qr_url} size={192} marginSize={2} />
                    <p className="text-xs text-center text-gray-500">Quét mã này bằng ứng dụng Google Authenticator hoặc Authy</p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Mã bí mật (Secret Key)</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all">{twoFAData.secret}</code>
                      </div>
                      <p className="text-xs text-muted-foreground">Dùng mã này nếu bạn không thể quét mã QR.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="2fa-code">Mã xác thực</Label>
                        <Input
                          id="2fa-code"
                          value={twoFACode}
                          onChange={(e) => setTwoFACode(e.target.value)}
                          placeholder="123456"
                          maxLength={6}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={handleEnable2FA} disabled={twoFALoading || !twoFACode}>
                          {twoFALoading ? 'Đang kích hoạt...' : 'Kích hoạt 2FA'}
                        </Button>
                        <Button variant="outline" onClick={() => { setShow2FASetup(false); setTwoFACode(''); }}>Hủy</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
