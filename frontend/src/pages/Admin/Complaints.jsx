import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock3, Inbox, MessageSquareWarning, Star, XCircle } from 'lucide-react';
import feedbackService from '../../services/feedbackService.js';
import Button from '../../components/common/Button.jsx';
import Loading from '../../components/common/Loading.jsx';
import { formatDateTime } from '../../utils/formatters.js';

const statusConfig = {
  PENDING: {
    label: 'Đang chờ',
    icon: Clock3,
    badge: 'border-amber-400/40 bg-amber-400/12 text-amber-700 dark:text-amber-200',
  },
  RESOLVED: {
    label: 'Đã xử lý',
    icon: CheckCircle2,
    badge: 'border-emerald-400/40 bg-emerald-400/12 text-emerald-700 dark:text-emerald-200',
  },
  REJECTED: {
    label: 'Từ chối',
    icon: XCircle,
    badge: 'border-rose-400/40 bg-rose-400/12 text-rose-700 dark:text-rose-200',
  },
};

function getComplaintRating(complaint) {
  const parsed = Number(complaint?.rating);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(5, Math.max(0, Math.round(parsed)));
}

function RatingStars({ value }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= value ? 'fill-amber-400 text-amber-400' : 'text-muted/30'}`}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = statusConfig[status] ?? statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${config.badge}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

export default function AdminComplaints() {
  const queryClient = useQueryClient();

  const { data: complaints, isLoading, error } = useQuery({
    queryKey: ['admin', 'complaints'],
    queryFn: feedbackService.getAllComplaints,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => feedbackService.updateComplaintStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'complaints'] });
      queryClient.invalidateQueries({ queryKey: ['feedback', 'complaints'] });
    },
    onError: (err) => {
      window.alert(err?.message || 'Không thể cập nhật trạng thái khiếu nại');
    },
  });

  const total = complaints?.length || 0;
  const pending = complaints?.filter((item) => item.status === 'PENDING').length || 0;
  const lowRating = complaints?.filter((item) => getComplaintRating(item) > 0 && getComplaintRating(item) <= 2).length || 0;
  const averageRating = total
    ? (complaints.reduce((sum, item) => sum + getComplaintRating(item), 0) / total).toFixed(1)
    : '0.0';

  if (isLoading) return <Loading title="Đang tải danh sách khiếu nại..." />;

  return (
    <div className="container mx-auto py-8 space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/35 bg-[radial-gradient(circle_at_10%_15%,rgba(45,212,191,.26),transparent_28%),radial-gradient(circle_at_82%_10%,rgba(251,191,36,.22),transparent_24%),linear-gradient(135deg,rgba(255,255,255,.96),rgba(236,254,255,.92)_48%,rgba(255,247,237,.9))] p-7 shadow-[0_26px_80px_rgba(14,165,233,.16)] dark:border-cyan-300/20 dark:bg-[radial-gradient(circle_at_10%_15%,rgba(45,212,191,.18),transparent_28%),radial-gradient(circle_at_82%_10%,rgba(251,191,36,.13),transparent_24%),linear-gradient(135deg,rgba(6,20,34,.96),rgba(8,47,73,.92)_48%,rgba(30,27,75,.9))]">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-300/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-800 dark:text-cyan-100">
              <MessageSquareWarning className="h-3.5 w-3.5" />
              Các đơn khiếu nại
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-text">Bảng xử lý report từ người dùng</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-700 dark:text-cyan-50/85">
                Theo dõi nội dung khiếu nại, điểm sao hài lòng và cập nhật trạng thái xử lý cho từng report gửi từ trang Hỗ trợ.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
            <Metric label="Tổng đơn" value={total} tone="text-cyan-700 dark:text-cyan-200" />
            <Metric label="Đang chờ" value={pending} tone="text-amber-600 dark:text-amber-200" />
            <Metric label="<= 2 sao" value={lowRating} tone="text-rose-600 dark:text-rose-200" />
            <Metric label="Sao TB" value={averageRating} tone="text-emerald-600 dark:text-emerald-200" />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-700 dark:text-rose-200">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          {error?.message || 'Có lỗi xảy ra khi tải danh sách khiếu nại.'}
        </div>
      )}

      <section className="grid gap-4">
        {complaints?.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-text/15 bg-surface py-16 text-center font-semibold text-slate-600 dark:text-cyan-50/75">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-cyan-500" />
            Chưa có khiếu nại nào được gửi.
          </div>
        ) : (
          complaints?.map((complaint) => (
            <article key={complaint.id} className="relative overflow-hidden rounded-3xl border border-text/10 bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-xl">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 via-amber-300 to-rose-400" />
              <div className="grid gap-5 lg:grid-cols-[1fr_180px]">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-black text-text">{complaint.title}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600 dark:text-cyan-50/75">
                        <span>{formatDateTime(complaint.created_at)}</span>
                        <span>{complaint.user_name || 'Khách hàng'}</span>
                        {complaint.user_email && <span>{complaint.user_email}</span>}
                      </div>
                    </div>
                    <StatusBadge status={complaint.status} />
                  </div>

                  <p className="rounded-2xl border border-slate-900/10 bg-white/75 p-4 text-sm font-semibold leading-relaxed text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-cyan-50/85">
                    {complaint.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-cyan-50/75">Đánh giá</span>
                    <RatingStars value={getComplaintRating(complaint)} />
                    <span className="text-sm font-black text-amber-600 dark:text-amber-200">{getComplaintRating(complaint)}/5</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-2xl border border-text/10 bg-bg/55 p-3">
                  <Button
                    variant={complaint.status === 'RESOLVED' ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: complaint.id, status: 'RESOLVED' })}
                  >
                    Đã xử lý
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: complaint.id, status: 'PENDING' })}
                  >
                    Đang chờ
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: complaint.id, status: 'REJECTED' })}
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-center shadow-sm dark:border-white/10 dark:bg-white/10">
      <div className={`text-3xl font-black ${tone}`}>{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-600 dark:text-cyan-50/80">{label}</div>
    </div>
  );
}
