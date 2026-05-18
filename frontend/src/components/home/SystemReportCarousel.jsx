import { useQuery } from '@tanstack/react-query';
import { MessageCircleHeart, ShieldCheck, Star } from 'lucide-react';
import feedbackService from '@/services/feedbackService';

function getRating(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(5, Math.max(0, Math.round(parsed)));
}

function getInitials(name) {
  if (!name) return 'TR';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function RatingStars({ value }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${star <= value ? 'fill-amber-400 text-amber-400' : 'text-foreground/15'}`}
        />
      ))}
    </div>
  );
}

function ReportCard({ report, index }) {
  const rating = getRating(report.rating);
  const userName = report.user_name || 'Khách hàng TicketRush';

  return (
    <article className="tr-report-card relative w-[15.25rem] shrink-0 overflow-hidden rounded-2xl border border-white/70 bg-white/72 p-4 shadow-[0_18px_52px_-36px_rgba(6,95,105,.75)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_62px_-38px_rgba(245,158,11,.65)] dark:border-white/10 dark:bg-white/[0.075] sm:w-[17rem]">
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-amber-300/24 blur-2xl dark:bg-amber-200/14" aria-hidden="true" />
      <div className="absolute -bottom-10 left-8 h-20 w-24 rounded-full bg-cyan-300/20 blur-2xl dark:bg-cyan-300/10" aria-hidden="true" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[conic-gradient(from_150deg,hsl(var(--tr-primary)),#f59e0b,hsl(var(--tr-accent)),hsl(var(--tr-primary)))] p-[2px] shadow-inner">
            <div className="grid h-full w-full place-items-center rounded-[0.65rem] bg-background text-xs font-black text-foreground">
              {getInitials(userName)}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-xs font-black text-foreground">{userName}</h3>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Report #{String(index + 1).padStart(2, '0')}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Đã xử lý
        </span>
      </div>

      <div className="relative mt-4 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <RatingStars value={rating} />
          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-black text-amber-700 dark:text-amber-200">
            {rating}/5
          </span>
        </div>
        <h4 className="line-clamp-2 min-h-[2.35rem] text-[15px] font-black leading-tight text-foreground">
          {report.title}
        </h4>
        <p className="line-clamp-3 min-h-[3.9rem] text-xs leading-5 text-muted-foreground">
          {report.content}
        </p>
      </div>
    </article>
  );
}

export default function SystemReportCarousel() {
  const { data = [] } = useQuery({
    queryKey: ['featured-complaints'],
    queryFn: () => feedbackService.getFeaturedComplaints(12),
    staleTime: 60_000,
  });

  const reports = data.filter((report) => getRating(report.rating) >= 4);
  if (reports.length === 0) return null;

  const loopItems = reports.length < 6
    ? [...reports, ...reports, ...reports, ...reports]
    : [...reports, ...reports];

  return (
    <section className="relative isolate overflow-hidden py-2" aria-labelledby="home-system-report-heading">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-300/12 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200">
            <MessageCircleHeart className="h-4 w-4" aria-hidden="true" />
            Report hệ thống
          </div>
          <h2 id="home-system-report-heading" className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
            Phản hồi tích cực từ người dùng TicketRush
          </h2>
        </div>
        
      </div>

      <ul className="sr-only">
        {reports.map((report) => (
          <li key={report.id}>
            {report.user_name || 'Khách hàng TicketRush'} đánh giá {getRating(report.rating)} trên 5 sao: {report.title}. {report.content}
          </li>
        ))}
      </ul>

      <div className="pointer-events-none absolute inset-y-16 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent sm:w-32" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-16 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent sm:w-32" aria-hidden="true" />

      <div className="tr-report-rail relative -mx-4 overflow-hidden px-4 py-3 sm:-mx-8 sm:px-8" aria-hidden="true">
        <div
          className="tr-report-track flex w-max gap-4"
          style={{ animation: 'tr-report-marquee-ltr 20s linear infinite' }}
        >
          {loopItems.map((report, index) => (
            <ReportCard
              key={`${report.id}-${index}`}
              report={report}
              index={index % reports.length}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
