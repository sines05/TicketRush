import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import userService from '../../services/userService.js';
import membershipService from '../../services/membershipService.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLES } from '../../constants/roles.js';
import {
  Bell,
  Crown,
  Mail,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserRoundCog,
  Users,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts.slice(-2).map((part) => part[0]).join('').toUpperCase();
}

function getUserTierId(user) {
  if (user?.membership_tier_id) return user.membership_tier_id;
  if (typeof user?.membership_tier === 'object' && user.membership_tier?.id) return user.membership_tier.id;
  if (typeof user?.membership_tier === 'string') return user.membership_tier;
  return '';
}

function getTierName(user, tiers = []) {
  if (typeof user?.membership_tier === 'object' && user.membership_tier?.name) return user.membership_tier.name;
  const tierId = getUserTierId(user);
  const tier = tiers.find((item) => item.id === tierId || item.name === tierId);
  if (tier?.name) return tier.name;
  if (typeof user?.membership_tier === 'string') return user.membership_tier;
  return tier?.name || 'Chưa có hạng';
}

function StatCard({ icon: Icon, label, value, helper, tone = 'teal' }) {
  const toneClasses = {
    teal: 'from-teal-500 to-cyan-400 text-teal-950 dark:text-teal-50',
    amber: 'from-amber-300 to-yellow-500 text-amber-950 dark:text-amber-50',
    rose: 'from-rose-400 to-pink-500 text-rose-950 dark:text-rose-50',
    violet: 'from-violet-400 to-indigo-500 text-violet-950 dark:text-violet-50',
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-900/10 bg-white/72 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_22px_70px_rgba(20,184,166,0.16)] dark:border-white/10 dark:bg-white/8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,.72),transparent_30%)] opacity-70 dark:opacity-20" />
      <div className="relative flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClasses[tone]} shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-cyan-50/60">{label}</div>
          <div className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{value}</div>
          <div className="text-xs font-bold text-slate-600 dark:text-cyan-50/72">{helper}</div>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === ROLES.ADMIN;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
        isAdmin
          ? 'border-amber-500/30 bg-amber-300/20 text-amber-800 dark:border-amber-300/30 dark:bg-amber-300/12 dark:text-amber-100'
          : 'border-teal-500/25 bg-teal-300/16 text-teal-800 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100'
      }`}
    >
      {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
      {role}
    </span>
  );
}

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: userService.getUsers,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    refetchInterval: 5_000,
  });

  const { data: tiers } = useQuery({
    queryKey: ['membership', 'tiers'],
    queryFn: membershipService.getTiers,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => userService.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const tierMutation = useMutation({
    mutationFn: ({ userId, tierId }) => userService.updateUserMembership(userId, tierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => userService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      window.alert('Đã xóa người dùng!');
    },
  });

  const notifyMutation = useMutation({
    mutationFn: ({ userId, message }) => userService.notifyUser(userId, message),
    onSuccess: () => {
      window.alert('Đã gửi thông báo cho người dùng!');
    },
  });

  const handleDelete = (userId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.')) {
      deleteMutation.mutate(userId);
    }
  };

  const handleNotify = (userId) => {
    const msg = window.prompt('Nhập nội dung thông báo:');
    if (msg) {
      notifyMutation.mutate({ userId, message: msg });
    }
  };

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return users || [];

    return (users || []).filter((user) =>
      user.full_name?.toLowerCase().includes(normalizedSearch) ||
      user.email?.toLowerCase().includes(normalizedSearch)
    );
  }, [searchTerm, users]);

  const stats = useMemo(() => {
    const source = users || [];
    const adminCount = source.filter((user) => user.role === ROLES.ADMIN).length;
    const customerCount = source.filter((user) => user.role === ROLES.CUSTOMER).length;
    const tieredCount = source.filter((user) => getUserTierId(user)).length;

    return {
      total: source.length,
      adminCount,
      customerCount,
      tieredCount,
    };
  }, [users]);

  return (
    <div className="relative left-1/2 isolate -my-6 w-screen -translate-x-1/2 overflow-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(20,184,166,0.22),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(245,158,11,0.22),transparent_30%),linear-gradient(180deg,#f8fafc,#ecfeff_48%,#fff7ed)] px-4 py-6 text-slate-950 dark:bg-[radial-gradient(circle_at_10%_0%,rgba(45,212,191,0.16),transparent_30%),radial-gradient(circle_at_92%_10%,rgba(251,191,36,0.14),transparent_32%),linear-gradient(180deg,#080415,#111827_52%,#180d16)] dark:text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute -left-28 top-40 h-80 w-80 rounded-full bg-teal-300/30 blur-3xl dark:bg-teal-400/12" />
      <div className="pointer-events-none absolute -right-20 top-10 h-96 w-96 rounded-full bg-amber-200/45 blur-3xl dark:bg-amber-300/10" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white/62 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.11)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/8 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,.62)_42%,transparent_58%)] bg-[length:220%_100%] opacity-45 dark:opacity-12" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-300/16 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-teal-800 shadow-sm dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100">
                <Sparkles className="h-3.5 w-3.5" />
                Trung tâm tài khoản
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">
                  Quản lý người dùng
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-700 dark:text-cyan-50/78 md:text-base">
                  Theo dõi người dùng hệ thống, phân quyền quản trị và điều chỉnh hạng thành viên mà không rời khỏi bảng điều phối.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:w-[360px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-700 dark:text-teal-100" />
              <Input
                placeholder="Tìm theo tên hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-13 rounded-2xl border-slate-900/10 bg-white/86 pl-11 text-base font-semibold text-slate-950 shadow-lg shadow-slate-900/5 placeholder:text-slate-500 focus-visible:ring-teal-500/35 dark:border-white/10 dark:bg-slate-950/55 dark:text-white dark:placeholder:text-cyan-50/55"
              />
            </div>
          </div>
        </section>

        {usersError && (
          <Alert variant="destructive" className="border-rose-400/30 bg-rose-50 text-rose-800 dark:bg-rose-950/45 dark:text-rose-100">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>
              {usersError?.message || 'Có lỗi xảy ra khi tải danh sách người dùng.'}
            </AlertDescription>
          </Alert>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Tổng người dùng" value={stats.total} helper={`${filteredUsers.length} đang hiển thị`} tone="teal" />
          <StatCard icon={ShieldCheck} label="Quản trị viên" value={stats.adminCount} helper="Có quyền vận hành" tone="amber" />
          <StatCard icon={UserCheck} label="Khách hàng" value={stats.customerCount} helper="Tài khoản mua vé" tone="violet" />
          <StatCard icon={Crown} label="Có hạng thành viên" value={stats.tieredCount} helper="Đã gán tier" tone="rose" />
        </section>

        <section className="relative overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white/72 shadow-[0_24px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(45,212,191,.18),transparent_28%),radial-gradient(circle_at_92%_4%,rgba(251,191,36,.16),transparent_30%)] dark:opacity-70" />
          <div className="relative border-b border-slate-900/10 px-5 py-5 dark:border-white/10 sm:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-300/12 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-800 dark:border-cyan-200/20 dark:text-cyan-100">
                  <UserRoundCog className="h-3.5 w-3.5" />
                  Danh sách phân quyền
                </div>
                <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">Danh sách người dùng</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-cyan-50/70">
                  Tổng cộng {filteredUsers.length} người dùng được tìm thấy.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-cyan-50/55">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,.8)]" />
                Tự cập nhật mỗi 5 giây
              </div>
            </div>
          </div>

          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-900/10 hover:bg-transparent dark:border-white/10">
                  <TableHead className="min-w-[280px] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-cyan-50/55">Người dùng</TableHead>
                  <TableHead className="min-w-[180px] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-cyan-50/55">Vai trò</TableHead>
                  <TableHead className="min-w-[210px] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-cyan-50/55">Hạng thành viên</TableHead>
                  <TableHead className="min-w-[150px] px-5 py-4 text-right text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-cyan-50/55">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index} className="border-slate-900/10 dark:border-white/10">
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
                          <div>
                            <div className="mb-2 h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                            <div className="h-3 w-48 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4"><div className="h-9 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" /></TableCell>
                      <TableCell className="px-5 py-4"><div className="h-9 w-36 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" /></TableCell>
                      <TableCell className="px-5 py-4"><div className="ml-auto h-9 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-5 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/8 text-slate-600 dark:bg-white/10 dark:text-cyan-50">
                          <Search className="h-6 w-6" />
                        </div>
                        <div className="text-base font-black text-slate-900 dark:text-white">Không tìm thấy người dùng nào.</div>
                        <div className="text-sm font-semibold text-slate-600 dark:text-cyan-50/68">Thử nhập tên hoặc email khác để lọc lại danh sách.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="group border-slate-900/10 transition hover:bg-teal-50/70 dark:border-white/10 dark:hover:bg-white/6">
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-400 to-amber-300 text-sm font-black text-slate-950 shadow-lg shadow-teal-500/15">
                            {getInitials(user.full_name)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-black text-slate-950 dark:text-white">{user.full_name}</div>
                              <RoleBadge role={user.role} />
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-cyan-50/68">
                              <Mail className="h-3.5 w-3.5" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Select
                          value={user.role}
                          onValueChange={(value) => roleMutation.mutate({ userId: user.id, role: value })}
                          disabled={roleMutation.isPending}
                        >
                          <SelectTrigger className="h-10 w-[150px] rounded-xl border-slate-900/10 bg-white/82 text-xs font-black text-slate-950 shadow-sm dark:border-white/10 dark:bg-slate-950/45 dark:text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-slate-900/10 bg-white text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white">
                            <SelectItem value={ROLES.CUSTOMER}>CUSTOMER</SelectItem>
                            <SelectItem value={ROLES.ADMIN}>ADMIN</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-300/14 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-800 dark:border-amber-300/25 dark:text-amber-100">
                            <Crown className="h-3.5 w-3.5" />
                            {getTierName(user, tiers)}
                          </span>
                          <Select
                            value={getUserTierId(user)}
                            onValueChange={(value) => tierMutation.mutate({ userId: user.id, tierId: value })}
                            disabled={tierMutation.isPending}
                          >
                            <SelectTrigger className="h-10 w-[170px] rounded-xl border-slate-900/10 bg-white/82 text-xs font-black text-slate-950 shadow-sm dark:border-white/10 dark:bg-slate-950/45 dark:text-white">
                              <SelectValue placeholder="Chọn hạng" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-900/10 bg-white text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white">
                              {tiers?.map((tier) => (
                                <SelectItem key={tier.id} value={tier.id}>{tier.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleNotify(user.id)}
                            title="Gửi thông báo"
                            aria-label={`Gửi thông báo cho ${user.full_name}`}
                            className="h-10 w-10 rounded-xl border border-slate-900/10 bg-white/72 text-slate-700 shadow-sm hover:bg-teal-50 hover:text-teal-700 dark:border-white/10 dark:bg-white/8 dark:text-cyan-50 dark:hover:bg-teal-300/10 dark:hover:text-teal-100"
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl border border-rose-500/20 bg-rose-50/80 text-rose-700 shadow-sm hover:bg-rose-100 hover:text-rose-800 dark:border-rose-300/15 dark:bg-rose-950/25 dark:text-rose-200 dark:hover:bg-rose-400/15"
                            onClick={() => handleDelete(user.id)}
                            title="Xóa người dùng"
                            aria-label={`Xóa người dùng ${user.full_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
