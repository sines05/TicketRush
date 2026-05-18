import { useQuery } from '@tanstack/react-query';
import { MessageSquare, ShieldCheck, Star } from 'lucide-react';
import feedbackService from '@/services/feedbackService';

const FALLBACK_REVIEWS = [
  {
    id: 'f1',
    rating: 5,
    event_title: "Jack - J97 Concert: Đom Đóm In The Stars",
    comment: "Đêm nhạc quá bùng nổ! Jack hát live cực đỉnh, không gian đầy ánh sáng lung linh huyền ảo của đom đóm.",
    user: { full_name: "Nguyễn Linh Chi" }
  },
  {
    id: 'f2',
    rating: 5,
    event_title: "Sơn Tùng M-TP: Sky Tour 2026",
    comment: "Sân khấu Sky Tour hoành tráng mang tầm vóc quốc tế. Sơn Tùng trình diễn quá chuyên nghiệp và lôi cuốn!",
    user: { full_name: "Lê Thùy Trang" }
  },
  {
    id: 'f3',
    rating: 5,
    event_title: "Rap Việt All-Star Concert 2026",
    comment: "Bữa tiệc Hip Hop tuyệt vời nhất từ trước đến nay! MCK, tlinh, Double2T diễn cháy hết mình.",
    user: { full_name: "Phạm Minh Đức" }
  },
  {
    id: 'f4',
    rating: 5,
    event_title: "BLACKPINK: BORN PINK World Tour Hanoi",
    comment: "BORN PINK Hanoi là kỷ niệm không bao giờ quên. 4 cô gái nhảy cực sung, âm thanh bùng nổ vô cùng!",
    user: { full_name: "Đặng Ngọc Anh" }
  },
  {
    id: 'f5',
    rating: 5,
    event_title: "Hà Anh Tuấn: Chân Trời Rực Rỡ (The Glorious Horizon)",
    comment: "Sự kết hợp hoàn hảo giữa giọng hát duy mỹ của anh Tuấn và âm nhạc Kitaro giữa Ninh Bình cổ kính.",
    user: { full_name: "Trần Văn Khách" }
  },
  {
    id: 'f6',
    rating: 4,
    event_title: "V-League 2026: Hà Nội FC vs HAGL",
    comment: "Trận đấu cực kỳ kịch tính, không khí sân Mỹ Đình vô cùng náo nhiệt. Mua vé trên TicketRush rất tiện lợi.",
    user: { full_name: "Vũ Hoàng Nam" }
  }
];

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

function ReviewCard({ review, index }) {
  const rating = getRating(review.rating);
  const userName = review.user?.full_name || review.user_name || 'Khách hàng TicketRush';
  const eventTitle = review.event_title || review.event?.title || 'Sự kiện hấp dẫn';

  return (
    <article className="tr-report-card relative w-[15.25rem] shrink-0 overflow-hidden rounded-2xl border border-white/70 bg-white/72 p-4 shadow-[0_18px_52px_-36px_rgba(6,95,105,.75)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_62px_-38px_rgba(245,158,11,.65)] dark:border-white/10 dark:bg-white/[0.075] sm:w-[17rem]">
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-300/24 blur-2xl dark:bg-cyan-200/14" aria-hidden="true" />
      <div className="absolute -bottom-10 left-8 h-20 w-24 rounded-full bg-amber-300/20 blur-2xl dark:bg-amber-300/10" aria-hidden="true" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[conic-gradient(from_150deg,hsl(var(--tr-primary)),#f59e0b,hsl(var(--tr-accent)),hsl(var(--tr-primary)))] p-[2px] shadow-inner">
            <div className="grid h-full w-full place-items-center rounded-[0.65rem] bg-background text-xs font-black text-foreground">
              {getInitials(userName)}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-xs font-black text-foreground">{userName}</h3>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Review #{String(index + 1).padStart(2, '0')}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-200">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Đã xác thực
        </span>
      </div>

      <div className="relative mt-4 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <RatingStars value={rating} />
          <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[11px] font-black text-cyan-700 dark:text-cyan-200">
            {rating}/5
          </span>
        </div>
        <h4 className="line-clamp-2 min-h-[2.35rem] text-[14px] font-black leading-tight text-foreground">
          {eventTitle}
        </h4>
        <p className="line-clamp-3 min-h-[3.9rem] text-xs leading-5 text-muted-foreground">
          {review.comment}
        </p>
      </div>
    </article>
  );
}

export default function EventReviewCarousel() {
  const { data: fetchedReviews = [] } = useQuery({
    queryKey: ['featured-reviews'],
    queryFn: () => feedbackService.getFeaturedReviews(12),
    staleTime: 60_000,
  });

  // Use fetched reviews if available, otherwise fall back to seeded mock reviews
  const reviews = fetchedReviews.length > 0 ? fetchedReviews : FALLBACK_REVIEWS;

  const loopItems = reviews.length < 6
    ? [...reviews, ...reviews, ...reviews, ...reviews]
    : [...reviews, ...reviews];

  return (
    <section className="relative isolate overflow-hidden py-8" aria-labelledby="home-event-review-heading">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-300/12 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-200">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Đánh giá từ khán giả
          </div>
          <h2 id="home-event-review-heading" className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
            Nhận xét đánh giá sự kiện của người dùng
          </h2>
        </div>
      </div>

      <ul className="sr-only">
        {reviews.map((review) => (
          <li key={review.id}>
            {review.user?.full_name || 'Khách hàng TicketRush'} đánh giá {getRating(review.rating)} trên 5 sao cho sự kiện {review.event_title || 'Sự kiện'}: {review.comment}
          </li>
        ))}
      </ul>

      <div className="tr-report-rail relative -mx-4 overflow-hidden px-4 py-3 sm:-mx-8 sm:px-8" aria-hidden="true">
        {/* Sleek edge fading gradient overlays positioned relative to the rail */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent sm:w-32" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent sm:w-32" aria-hidden="true" />

        <div
          className="tr-report-track flex w-max gap-4"
          style={{ animation: 'tr-report-marquee-ltr 20s linear infinite' }}
        >
          {loopItems.map((review, index) => (
            <ReviewCard
              key={`${review.id}-${index}`}
              review={review}
              index={index % reviews.length}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
