import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, MessageSquareWarning, Send, ShieldCheck, Sparkles, Star } from 'lucide-react';
import feedbackService from '../../services/feedbackService.js';
import Button from '../../components/common/Button.jsx';

const statusMeta = {
  PENDING: {
    label: 'Đang chờ xử lý',
    icon: Clock3,
    className: 'border-amber-400/40 bg-amber-400/12 text-amber-700 dark:text-amber-200',
  },
  RESOLVED: {
    label: 'Đã giải quyết',
    icon: CheckCircle2,
    className: 'border-emerald-400/40 bg-emerald-400/12 text-emerald-700 dark:text-emerald-200',
  },
  REJECTED: {
    label: 'Từ chối',
    icon: AlertTriangle,
    className: 'border-rose-400/40 bg-rose-400/12 text-rose-700 dark:text-rose-200',
  },
};

function getComplaintRating(complaint) {
  const parsed = Number(complaint?.rating);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(5, Math.max(0, Math.round(parsed)));
}

function RatingStars({ value, onChange, readOnly = false, size = 'md' }) {
  const starSize = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1" aria-label={`${value || 0} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        const className = `${starSize} transition-all ${active ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-muted/35'}`;

        if (readOnly) {
          return <Star key={star} className={className} />;
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="rounded-full p-1 transition hover:-translate-y-0.5 hover:bg-amber-300/15 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
            aria-label={`Chọn ${star} sao`}
          >
            <Star className={className} />
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = statusMeta[status] ?? statusMeta.PENDING;
  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

export default function Feedback() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [showForm, setShowForm] = useState(false);

  const { data: complaints, isLoading: complaintsLoading } = useQuery({
    queryKey: ['feedback', 'complaints'],
    queryFn: feedbackService.getComplaints,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const complaintMutation = useMutation({
    mutationFn: feedbackService.submitComplaint,
    onSuccess: (createdComplaint, variables) => {
      const fallbackComplaint = {
        id: `local-${Date.now()}`,
        title: variables.title,
        content: variables.content,
        rating: variables.rating,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      };
      const nextComplaint = createdComplaint?.id ? createdComplaint : fallbackComplaint;

      queryClient.setQueryData(['feedback', 'complaints'], (current = []) => [nextComplaint, ...current]);
      queryClient.invalidateQueries({ queryKey: ['admin', 'complaints'] });
      setTitle('');
      setContent('');
      setRating(5);
      setShowForm(false);
    },
  });

  const stats = useMemo(() => {
    const total = complaints?.length || 0;
    const pending = complaints?.filter((item) => item.status === 'PENDING').length || 0;
    const average = total
      ? (complaints.reduce((sum, item) => sum + getComplaintRating(item), 0) / total).toFixed(1)
      : '0.0';

    return { total, pending, average };
  }, [complaints]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    complaintMutation.mutate({ title: title.trim(), content: content.trim(), rating });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/40 bg-[radial-gradient(circle_at_12%_18%,rgba(45,212,191,.28),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(251,191,36,.24),transparent_24%),linear-gradient(135deg,rgba(255,255,255,.96),rgba(236,254,255,.9)_46%,rgba(255,247,237,.92))] p-8 shadow-[0_28px_90px_rgba(14,165,233,.18)] dark:border-cyan-300/25 dark:bg-[radial-gradient(circle_at_12%_18%,rgba(45,212,191,.2),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(251,191,36,.16),transparent_24%),linear-gradient(135deg,rgba(6,20,34,.96),rgba(8,47,73,.92)_46%,rgba(30,27,75,.9))] dark:shadow-[0_28px_90px_rgba(34,211,238,.12)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,.62)_42%,transparent_58%)] bg-[length:220%_100%] opacity-45 dark:opacity-20" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-300/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Trung tâm phản hồi hệ thống
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-text md:text-5xl">
                Hỗ trợ & Khiếu nại
              </h1>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-slate-700 dark:text-cyan-50/85">
                Gửi report về lỗi đặt vé, thanh toán, tài khoản hoặc trải nghiệm dịch vụ. Mỗi phản hồi có điểm sao để đội quản trị ưu tiên xử lý đúng mức độ ảnh hưởng.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setShowForm(!showForm)} className="rounded-full px-5">
                <MessageSquareWarning className="mr-2 h-4 w-4" />
                {showForm ? 'Đóng form' : 'Gửi khiếu nại mới'}
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full border border-text/10 bg-white/70 px-4 py-2 text-sm font-semibold text-text shadow-sm dark:bg-white/10">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Có lưu lịch sử xử lý
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-center shadow-sm dark:border-white/10 dark:bg-white/10">
              <div className="text-3xl font-black text-cyan-700 dark:text-cyan-200">{stats.total}</div>
              <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-600 dark:text-cyan-50/80">Report</div>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-center shadow-sm dark:border-white/10 dark:bg-white/10">
              <div className="text-3xl font-black text-amber-600 dark:text-amber-200">{stats.pending}</div>
              <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-600 dark:text-cyan-50/80">Đang chờ</div>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-center shadow-sm dark:border-white/10 dark:bg-white/10">
              <div className="text-3xl font-black text-rose-600 dark:text-rose-200">{stats.average}</div>
              <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-600 dark:text-cyan-50/80">Sao TB</div>
            </div>
          </div>
        </div>
      </section>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="relative overflow-hidden rounded-3xl border border-text/10 bg-surface p-6 shadow-xl animate-in zoom-in-95 duration-300"
        >
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative grid gap-5 lg:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Tiêu đề report</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Không thể thanh toán đơn hàng"
                  className="w-full rounded-2xl border border-text/10 bg-bg px-4 py-3 text-base outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Nội dung chi tiết</label>
                <textarea
                  rows="5"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Mô tả thao tác bạn đã thử, thời điểm gặp lỗi, mã đơn hàng nếu có..."
                  className="w-full resize-none rounded-2xl border border-text/10 bg-bg px-4 py-3 text-base outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
              <div>
                <div className="text-sm font-black text-text">Đánh giá mức hài lòng</div>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 dark:text-cyan-50/75">1 sao là rất tệ, 5 sao là tốt. Admin sẽ thấy điểm này trong trang quản trị.</p>
                <div className="mt-4">
                  <RatingStars value={rating} onChange={setRating} size="lg" />
                </div>
                <div className="mt-3 text-sm font-bold text-amber-700 dark:text-amber-200">{rating}/5 sao</div>
              </div>
              <Button type="submit" disabled={complaintMutation.isPending} className="mt-6 rounded-full">
                <Send className="mr-2 h-4 w-4" />
                {complaintMutation.isPending ? 'Đang gửi...' : 'Xác nhận gửi'}
              </Button>
            </div>
          </div>
        </form>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-text">Lịch sử khiếu nại</h2>
          <span className="rounded-full bg-slate-900/10 px-3 py-1 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-cyan-50/85">{stats.total} mục</span>
        </div>
        <div className="grid gap-4">
          {complaintsLoading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-3xl bg-surface border border-text/10" />
            ))
          ) : complaints?.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-cyan-400/40 bg-cyan-300/5 py-14 text-center font-semibold text-slate-600 dark:text-cyan-50/75">
              Bạn chưa có khiếu nại nào.
            </div>
          ) : (
            complaints?.map((complaint) => (
              <article key={complaint.id} className="group relative overflow-hidden rounded-3xl border border-text/10 bg-surface p-6 transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-lg">
                <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 via-amber-300 to-rose-400" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="font-black text-text transition-colors group-hover:text-cyan-600 dark:group-hover:text-cyan-200">{complaint.title}</div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600 dark:text-cyan-50/75">
                      <span>{new Date(complaint.created_at).toLocaleString('vi-VN')}</span>
                      <RatingStars value={getComplaintRating(complaint)} readOnly />
                      <span className="font-bold">{getComplaintRating(complaint)}/5</span>
                    </div>
                  </div>
                  <StatusBadge status={complaint.status} />
                </div>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-700 dark:text-cyan-50/80">{complaint.content}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
