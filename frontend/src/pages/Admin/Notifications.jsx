import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import notificationService from '../../services/notificationService.js';
import userService from '../../services/userService.js';
import FormattedNotificationMessage from '../../components/notifications/FormattedNotificationMessage.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  Bell,
  Bold,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Italic,
  List,
  Megaphone,
  Search,
  Send,
  ShieldCheck,
  SmilePlus,
  Sparkles,
  Underline,
  Users,
  Wand2,
  X,
} from 'lucide-react';

const NOTIF_TYPE_OPTIONS = [
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'PROMOTION', label: 'Khuyến mãi' },
  { value: 'SYSTEM', label: 'Hệ thống' },
];

const NOTIF_TYPE_LABELS = {
  SYSTEM: 'Hệ thống',
  ORDER: 'Đơn hàng',
  EVENT_REMINDER: 'Nhắc sự kiện',
  PAYMENT_REMINDER: 'Nhắc thanh toán',
  PROMOTION: 'Khuyến mãi',
  ADMIN: 'Quản trị',
};

const EMOJI_PRESETS = ['🎟️', '🔥', '✨', '🎉', '⚡', '💎'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts.slice(-2).map((part) => part[0]).join('').toUpperCase();
}

function StatCard({ icon: Icon, label, value, helper, tone = 'teal' }) {
  const toneClasses = {
    teal: 'from-teal-500 to-cyan-400 text-teal-950 dark:text-teal-50',
    amber: 'from-amber-300 to-yellow-500 text-amber-950 dark:text-amber-50',
    rose: 'from-rose-400 to-pink-500 text-rose-950 dark:text-rose-50',
    violet: 'from-violet-400 to-indigo-500 text-violet-950 dark:text-violet-50',
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-900/10 bg-white/72 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,.72),transparent_30%)] opacity-70 dark:opacity-20" />
      <div className="relative flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClasses[tone]} shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-cyan-50/60">{label}</div>
          <div className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{value}</div>
          <div className="mt-1 inline-flex rounded-lg bg-white/60 px-2 py-1 text-xs font-black leading-tight text-slate-700 dark:bg-slate-950/55 dark:text-cyan-50">{helper}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const messageRef = useRef(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notifType, setNotifType] = useState('ADMIN');
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSelectPage, setUserSelectPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const handleSearchChange = (val) => {
    setUserSearchTerm(val);
    setUserSelectPage(1);
  };

  const { data: allUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: userService.getUsers,
    staleTime: 60_000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['admin', 'notifications', historyPage],
    queryFn: () => notificationService.adminGetNotifications(historyPage, 15),
    refetchOnMount: 'always',
  });

  const sendMutation = useMutation({
    mutationFn: notificationService.adminSendNotification,
    onSuccess: () => {
      setFormSuccess('Gửi thông báo thành công!');
      setFormError('');
      setTitle('');
      setMessage('');
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (err) => {
      setFormError(err?.message || 'Gửi thông báo thất bại');
      setFormSuccess('');
    },
  });

  const matchingUsers = allUsers?.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.id?.toLowerCase().includes(userSearchTerm.toLowerCase())
  ) || [];

  const userSelectPageSize = 8;
  const totalSelectPages = Math.ceil(matchingUsers.length / userSelectPageSize) || 1;
  const currentPage = Math.min(userSelectPage, totalSelectPages);
  const displayedUsers = matchingUsers.slice((currentPage - 1) * userSelectPageSize, currentPage * userSelectPageSize);

  function handleAddUser(user) {
    setSelectedUsers((prev) => (prev.some((item) => item.id === user.id) ? prev : [...prev, user]));
  }

  function handleRemoveUser(userId) {
    setSelectedUsers((prev) => prev.filter((user) => user.id !== userId));
  }

  const replaceMessageSelection = useCallback((transform, fallback = '') => {
    const textarea = messageRef.current;
    if (!textarea) {
      setMessage((current) => `${current}${fallback}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = message.slice(start, end);
    const replacement = transform(selected || fallback);
    const next = `${message.slice(0, start)}${replacement}${message.slice(end)}`;

    setMessage(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + replacement.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }, [message]);

  const insertSnippet = useCallback((snippet) => {
    replaceMessageSelection((selected) => selected || snippet, snippet);
  }, [replaceMessageSelection]);

  const applyList = () => {
    replaceMessageSelection((selected) => {
      const content = selected || 'Ý chính cần nhấn mạnh';
      return content
        .split(/\r?\n/)
        .map((line) => `- ${line.replace(/^[-•]\s+/, '')}`)
        .join('\n');
    }, 'Ý chính cần nhấn mạnh');
  };

  function handleSend() {
    setFormError('');
    setFormSuccess('');

    if (!title.trim() || !message.trim()) {
      setFormError('Vui lòng nhập tiêu đề và nội dung');
      return;
    }

    if (!isBroadcast && selectedUsers.length === 0) {
      setFormError('Vui lòng chọn ít nhất một người nhận');
      return;
    }

    sendMutation.mutate({
      user_ids: isBroadcast ? [] : selectedUsers.map((user) => user.id),
      title: title.trim(),
      message: message.trim(),
      type: notifType,
    });
  }

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
                Trung tâm phát tin
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">
                  Quản lý Thông báo
                </h1>
                
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-[710px]">
              <StatCard icon={Bell} label="Lịch sử" value={historyData?.total || 0} helper="Thông báo đã gửi" tone="teal" />
              <StatCard icon={Users} label="Người dùng" value={allUsers?.length || 0} helper="Có thể nhận tin" tone="violet" />
              <StatCard icon={ShieldCheck} label="Đích gửi" value={isBroadcast ? 'All' : selectedUsers.length} helper={isBroadcast ? 'Toàn hệ thống' : 'Đã chọn'} tone="amber" />
            </div>
          </div>
        </section>

        {(formError || formSuccess) && (
          <Alert
            variant={formError ? 'destructive' : 'default'}
            className={formSuccess
              ? 'border-emerald-400/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100'
              : 'border-rose-400/30 bg-rose-50 text-rose-800 dark:bg-rose-950/45 dark:text-rose-100'}
          >
            {formError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <AlertTitle>{formError ? 'Lỗi' : 'Thành công'}</AlertTitle>
            <AlertDescription>{formError || formSuccess}</AlertDescription>
          </Alert>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white/72 shadow-[0_24px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(45,212,191,.18),transparent_28%),radial-gradient(circle_at_92%_4%,rgba(251,191,36,.16),transparent_30%)] dark:opacity-70" />
            <div className="relative border-b border-slate-900/10 px-5 py-5 dark:border-white/10 sm:px-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-300/12 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-800 dark:border-cyan-200/20 dark:text-cyan-100">
                <Send className="h-3.5 w-3.5" />
                Soạn & gửi
              </div>
              <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">Gửi thông báo mới</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-cyan-50/70">
                Dùng toolbar để chèn định dạng, bullet và emoji vào nội dung.
              </p>
            </div>

            <div className="relative space-y-6 p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-black text-slate-700 dark:text-cyan-50/80">Loại thông báo</Label>
                  <Select value={notifType} onValueChange={setNotifType}>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-900/10 bg-white/86 text-sm font-black text-slate-950 shadow-sm dark:border-white/10 dark:bg-slate-950/45 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-900/10 bg-white text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white">
                      {NOTIF_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-black text-slate-700 dark:text-cyan-50/80">Người nhận</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-900/10 bg-white/70 p-1.5 shadow-sm dark:border-white/10 dark:bg-slate-950/35">
                    <button
                      type="button"
                      onClick={() => { setIsBroadcast(true); setSelectedUsers([]); }}
                      className={`rounded-xl px-3 py-2 text-sm font-black transition ${isBroadcast ? 'bg-slate-950 text-white shadow-lg dark:bg-cyan-100 dark:text-slate-950' : 'text-slate-600 hover:bg-slate-900/5 dark:text-cyan-50/70 dark:hover:bg-white/10'}`}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBroadcast(false)}
                      className={`rounded-xl px-3 py-2 text-sm font-black transition ${!isBroadcast ? 'bg-slate-950 text-white shadow-lg dark:bg-cyan-100 dark:text-slate-950' : 'text-slate-600 hover:bg-slate-900/5 dark:text-cyan-50/70 dark:hover:bg-white/10'}`}
                    >
                      Cá nhân
                    </button>
                  </div>
                </div>
              </div>

              {!isBroadcast && (
                <div className="space-y-4 rounded-3xl border border-slate-900/10 bg-white/60 p-4 shadow-inner dark:border-white/10 dark:bg-slate-950/28">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-black text-slate-900 dark:text-white">Tìm & chọn người nhận</div>
                    <span className="w-fit rounded-full border border-teal-500/25 bg-teal-300/14 px-3 py-1 text-xs font-black text-teal-800 dark:border-teal-300/25 dark:text-teal-100">
                      Đã chọn {selectedUsers.length}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-700 dark:text-teal-100" />
                    <Input
                      placeholder="Tìm theo tên, email hoặc ID..."
                      value={userSearchTerm}
                      onChange={(event) => handleSearchChange(event.target.value)}
                      className="h-12 rounded-2xl border-slate-900/10 bg-white/86 pl-11 text-base font-semibold text-slate-950 placeholder:text-slate-500 dark:border-white/10 dark:bg-slate-950/45 dark:text-white dark:placeholder:text-cyan-50/55"
                    />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-900/10 bg-white/78 dark:border-white/10 dark:bg-slate-950/35">
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-900/10 dark:divide-white/10">
                      {displayedUsers.length === 0 ? (
                        <div className="p-6 text-center text-sm font-semibold text-slate-600 dark:text-cyan-50/70">
                          Không tìm thấy người dùng phù hợp.
                        </div>
                      ) : (
                        displayedUsers.map((user) => {
                          const isSelected = selectedUsers.some((selected) => selected.id === user.id);
                          return (
                            <button
                              type="button"
                              key={user.id}
                              onClick={() => (isSelected ? handleRemoveUser(user.id) : handleAddUser(user))}
                              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${isSelected ? 'bg-teal-50 dark:bg-teal-300/10' : 'hover:bg-slate-900/5 dark:hover:bg-white/7'}`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 via-cyan-400 to-amber-300 text-xs font-black text-slate-950">
                                  {getInitials(user.full_name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-slate-950 dark:text-white">{user.full_name || 'Người dùng không tên'}</p>
                                  <p className="truncate text-xs font-semibold text-slate-600 dark:text-cyan-50/65">{user.email}</p>
                                </div>
                              </div>
                              <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${isSelected ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-100' : 'bg-slate-900/8 text-slate-600 dark:bg-white/10 dark:text-cyan-50/65'}`}>
                                {isSelected ? 'Đã chọn' : 'Chọn'}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {matchingUsers.length > 0 && (
                      <div className="flex flex-col gap-3 border-t border-slate-900/10 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-cyan-50/65">
                          Hiển thị {(currentPage - 1) * userSelectPageSize + 1} - {Math.min(currentPage * userSelectPageSize, matchingUsers.length)} trong số {matchingUsers.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setUserSelectPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="min-w-[64px] rounded-lg border border-slate-900/10 bg-white px-2 py-1 text-center text-xs font-black dark:border-white/10 dark:bg-white/10">
                            {currentPage} / {totalSelectPages}
                          </span>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setUserSelectPage((page) => Math.min(page + 1, totalSelectPages))} disabled={currentPage >= totalSelectPages}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedUsers.length > 0 && (
                    <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-slate-900/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/7">
                      {selectedUsers.map((user) => (
                        <span key={user.id} className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-3 py-1 text-xs font-black text-white dark:bg-teal-200 dark:text-slate-950">
                          {user.full_name || user.email}
                          <button type="button" onClick={() => handleRemoveUser(user.id)} className="rounded-full p-0.5 hover:bg-white/20">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notif-title" className="text-sm font-black text-slate-700 dark:text-cyan-50/80">Tiêu đề</Label>
                <Input
                  id="notif-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ví dụ: Chương trình khuyến mãi đặc biệt..."
                  className="h-12 rounded-2xl border-slate-900/10 bg-white/86 text-base font-semibold text-slate-950 placeholder:text-slate-500 dark:border-white/10 dark:bg-slate-950/45 dark:text-white dark:placeholder:text-cyan-50/55"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notif-message" className="text-sm font-black text-slate-700 dark:text-cyan-50/80">Nội dung thông báo</Label>
                <div className="rounded-3xl border border-slate-900/10 bg-white/86 shadow-sm dark:border-white/10 dark:bg-slate-950/45">
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-900/10 p-2 dark:border-white/10">
                    <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={() => replaceMessageSelection((text) => `**${text}**`, 'nội dung in đậm')}>
                      <Bold className="mr-1 h-4 w-4" /> Đậm
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={() => replaceMessageSelection((text) => `*${text}*`, 'nội dung in nghiêng')}>
                      <Italic className="mr-1 h-4 w-4" /> Nghiêng
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={() => replaceMessageSelection((text) => `__${text}__`, 'nội dung gạch chân')}>
                      <Underline className="mr-1 h-4 w-4" /> Gạch chân
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={applyList}>
                      <List className="mr-1 h-4 w-4" /> Bullet
                    </Button>
                    <div className="h-6 w-px bg-slate-900/10 dark:bg-white/10" />
                    {EMOJI_PRESETS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => insertSnippet(`${emoji} `)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition hover:bg-slate-900/8 dark:hover:bg-white/10"
                        aria-label={`Chèn ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    ref={messageRef}
                    id="notif-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Nhập nội dung thông báo..."
                    rows={7}
                    className="min-h-44 resize-y border-0 bg-transparent text-base font-semibold leading-relaxed text-slate-950 placeholder:text-slate-500 focus-visible:ring-0 dark:text-white dark:placeholder:text-cyan-50/55"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-3xl border border-slate-900/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-slate-600 dark:text-cyan-50/70">
                  {isBroadcast ? (
                    <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Gửi đến tất cả người dùng</span>
                  ) : (
                    <span>{selectedUsers.length} người nhận được chọn</span>
                  )}
                </p>
                <Button onClick={handleSend} disabled={sendMutation.isPending} className="h-12 rounded-2xl bg-slate-950 px-5 font-black text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800 dark:bg-cyan-100 dark:text-slate-950 dark:hover:bg-cyan-200">
                  <Send className="mr-2 h-4 w-4" />
                  {sendMutation.isPending ? 'Đang gửi...' : 'Gửi thông báo'}
                </Button>
              </div>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white/72 shadow-[0_24px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(251,191,36,.22),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(45,212,191,.16),transparent_30%)]" />
            <div className="relative border-b border-slate-900/10 px-5 py-5 dark:border-white/10">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-300/14 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-amber-800 dark:border-amber-300/25 dark:text-amber-100">
                <Wand2 className="h-3.5 w-3.5" />
                Preview
              </div>
              <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">Xem trước nội dung</h2>
            </div>
            <div className="relative p-5">
              <div className="rounded-3xl border border-slate-900/10 bg-white/78 p-5 shadow-inner dark:border-white/10 dark:bg-slate-950/35">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-400 to-amber-300 text-slate-950 shadow-lg">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950 dark:text-white">{title || 'Tiêu đề thông báo'}</h3>
                      <span className="rounded-full bg-slate-900/8 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:bg-white/10 dark:text-cyan-50/70">
                        {NOTIF_TYPE_LABELS[notifType] || notifType}
                      </span>
                    </div>
                    {message ? (
                      <FormattedNotificationMessage message={message} className="mt-3 space-y-1 text-sm font-semibold leading-relaxed text-slate-700 dark:text-cyan-50/80" />
                    ) : (
                      <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-cyan-50/55">Nội dung preview sẽ xuất hiện ở đây.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-900/10 bg-slate-950 p-4 text-white shadow-xl dark:border-white/10 dark:bg-black/35">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-100/75">
                  <SmilePlus className="h-4 w-4" />
                  Cú pháp hỗ trợ
                </div>
                <div className="mt-3 grid gap-2 text-sm font-semibold text-white/82">
                  <div><strong>**Đậm**</strong> để nhấn mạnh ưu đãi.</div>
                  <div><em>*Nghiêng*</em> cho ghi chú nhẹ.</div>
                  <div><span className="underline underline-offset-2">_Gạch chân_</span> cho hạn chót.</div>
                  
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white/72 shadow-[0_24px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(45,212,191,.14),transparent_28%),radial-gradient(circle_at_92%_4%,rgba(251,191,36,.12),transparent_30%)] dark:opacity-70" />
          <div className="relative border-b border-slate-900/10 px-5 py-5 dark:border-white/10 sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-300/12 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-800 dark:border-cyan-200/20 dark:text-cyan-100">
              <Bell className="h-3.5 w-3.5" />
              Lịch sử
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">Lịch sử thông báo</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-cyan-50/70">
              Tổng cộng {historyData?.total || 0} thông báo.
            </p>
          </div>

          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-900/10 hover:bg-transparent dark:border-white/10">
                  <TableHead className="min-w-[150px] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-cyan-50/55">Thời gian</TableHead>
                  <TableHead className="min-w-[360px] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-cyan-50/55">Nội dung</TableHead>
                  <TableHead className="min-w-[140px] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-cyan-50/55">Loại</TableHead>
                  <TableHead className="min-w-[140px] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-cyan-50/55">Người nhận</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index} className="border-slate-900/10 dark:border-white/10">
                      <TableCell className="px-5 py-4"><div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></TableCell>
                      <TableCell className="px-5 py-4"><div className="h-4 w-64 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></TableCell>
                      <TableCell className="px-5 py-4"><div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></TableCell>
                      <TableCell className="px-5 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/10" /></TableCell>
                    </TableRow>
                  ))
                ) : historyData?.notifications?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-5 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/8 text-slate-600 dark:bg-white/10 dark:text-cyan-50">
                          <Bell className="h-6 w-6" />
                        </div>
                        <div className="text-base font-black text-slate-900 dark:text-white">Chưa có thông báo nào được gửi.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  historyData?.notifications?.map((notification) => (
                    <TableRow key={notification.id} className="border-slate-900/10 transition hover:bg-teal-50/70 dark:border-white/10 dark:hover:bg-white/6">
                      <TableCell className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-600 dark:text-cyan-50/68">
                        {formatDate(notification.created_at)}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div>
                          <p className="text-sm font-black text-slate-950 dark:text-white">{notification.title}</p>
                          <FormattedNotificationMessage message={notification.message} className="mt-1 line-clamp-2 space-y-0.5 text-xs font-semibold leading-relaxed text-slate-600 dark:text-cyan-50/70" />
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-slate-900/8 px-3 py-1 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-cyan-50/75">
                          {NOTIF_TYPE_LABELS[notification.type] || notification.type}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm font-bold">
                        {notification.is_broadcast ? (
                          <span className="flex items-center gap-1 text-teal-700 dark:text-teal-100">
                            <Users className="h-3.5 w-3.5" /> Tất cả
                          </span>
                        ) : (
                          <span className="text-slate-600 dark:text-cyan-50/70">Cá nhân</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {historyData?.total > 15 && (
              <div className="flex items-center justify-center gap-2 border-t border-slate-900/10 px-5 py-4 dark:border-white/10">
                <Button variant="outline" size="sm" onClick={() => setHistoryPage((page) => Math.max(1, page - 1))} disabled={historyPage <= 1}>
                  Trước
                </Button>
                <span className="text-sm font-bold text-slate-600 dark:text-cyan-50/70">Trang {historyPage}</span>
                <Button variant="outline" size="sm" onClick={() => setHistoryPage((page) => page + 1)} disabled={(historyData?.notifications?.length || 0) < 15}>
                  Sau
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
