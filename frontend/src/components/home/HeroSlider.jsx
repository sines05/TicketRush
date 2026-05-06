import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import bannerFallback from '../../assets/banner-sample.svg';
import { getCategoryLabel } from '../../constants/categories.js';
import eventService from '../../services/eventService.js';
import { formatDateTime } from '../../utils/formatters.js';
import { resolveMediaUrl } from '../../utils/media.js';

const isValidUUID = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default function HeroSlider() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    eventService
      .getFeaturedEvents()
      .then((data) => {
        if (!mounted) return;
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Không tải được banner nổi bật');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const slides = useMemo(() => events.slice(0, 5), [events]);

  if (loading) {
    return (
      <section className="overflow-hidden rounded-3xl border border-text/10 bg-surface shadow-[0_20px_70px_-30px_rgb(var(--tr-brand-700)/0.45)]">
        <div className="grid min-h-[22rem] gap-0 md:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-pulse bg-gradient-to-br from-text/5 to-text/10" />
          <div className="space-y-4 p-6 md:p-8">
            <div className="h-4 w-32 rounded-full bg-text/10" />
            <div className="h-10 w-4/5 rounded-2xl bg-text/10" />
            <div className="h-4 w-full rounded-full bg-text/10" />
            <div className="h-4 w-5/6 rounded-full bg-text/10" />
            <div className="mt-8 h-12 w-40 rounded-2xl bg-text/10" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="overflow-hidden rounded-3xl border border-text/10 bg-surface p-5 text-sm text-muted shadow-[0_20px_70px_-30px_rgb(var(--tr-brand-700)/0.45)]">
        {error}
      </section>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <section className="tr-hero-slider overflow-hidden rounded-3xl border border-text/10 bg-surface shadow-[0_24px_80px_-32px_rgb(var(--tr-brand-700)/0.45)]">
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        autoplay={{ delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        loop={slides.length > 1}
        navigation={{ nextEl: '.tr-hero-next', prevEl: '.tr-hero-prev' }}
        pagination={{ clickable: true }}
        className="relative"
      >
        {slides.map((event) => (
          <SwiperSlide key={event.id}>
            <article className="relative isolate min-h-[24rem] overflow-hidden md:min-h-[26rem]">
              <img
                src={resolveMediaUrl(event.banner_url) || bannerFallback}
                alt={event.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/72 to-bg/15" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--tr-accent)/0.20),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(var(--tr-brand-600)/0.24),transparent_32%)]" />

              <div className="relative z-10 flex min-h-[24rem] items-end md:min-h-[26rem]">
                <div className="grid w-full gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
                  <div className="max-w-2xl space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-text/10 bg-surface/80 px-3 py-1 text-xs font-semibold text-muted shadow-sm backdrop-blur">
                      <span className="h-2 w-2 rounded-full bg-brand-600" />
                      Banner nổi bật
                      <span className="text-text/50">•</span>
                      {getCategoryLabel(event.category)}
                    </div>

                    <h2 className="text-3xl font-black tracking-tight text-text md:text-5xl">
                      {event.title}
                    </h2>

                    <p className="max-w-xl text-sm leading-6 text-muted md:text-base">
                      {event.description || 'Sự kiện nổi bật được chọn để hiển thị trên hero banner.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                      <span className="rounded-full border border-text/10 bg-surface/70 px-3 py-1 backdrop-blur">
                        {formatDateTime(event.start_time)}
                      </span>
                      {event.end_time && (
                        <span className="rounded-full border border-text/10 bg-surface/70 px-3 py-1 backdrop-blur">
                          Kết thúc: {formatDateTime(event.end_time)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      {isValidUUID(event.id) ? (
                        <Link
                          to={`/events/${event.slug || event.id}`}
                          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-accent px-5 py-3 text-sm font-semibold text-on-brand shadow-lg shadow-brand-600/20 transition hover:translate-y-[-1px]"
                        >
                          Xem chi tiết
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="ID sự kiện không hợp lệ"
                          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-accent/60 px-5 py-3 text-sm font-semibold text-on-brand/70 shadow-lg shadow-brand-600/10 opacity-60"
                        >
                          Xem chi tiết
                        </button>
                      )}

                      {isValidUUID(event.id) ? (
                        <Link
                          to={`/booking/queue?eventId=${event.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-text/10 bg-surface/80 px-5 py-3 text-sm font-semibold text-text backdrop-blur transition hover:border-brand-600/35 hover:bg-text/5"
                        >
                          Mua vé ngay
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="ID sự kiện không hợp lệ"
                          className="inline-flex items-center justify-center rounded-xl border border-text/10 bg-surface/80 px-5 py-3 text-sm font-semibold text-text opacity-60"
                        >
                          Mua vé ngay
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-start md:justify-end">
                    <div className="w-full max-w-sm rounded-3xl border border-text/10 bg-surface/80 p-4 shadow-2xl backdrop-blur md:p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                        Spotlight
                      </div>
                      <div className="mt-3 overflow-hidden rounded-2xl border border-text/10 bg-bg/60">
                        <img
                          src={resolveMediaUrl(event.banner_url) || bannerFallback}
                          alt={event.title}
                          className="h-56 w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-muted">
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-text/10 bg-bg/50 px-3 py-2">
                          <span>Thể loại</span>
                          <span className="font-semibold text-text">{getCategoryLabel(event.category)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-text/10 bg-bg/50 px-3 py-2">
                          <span>Thời gian</span>
                          <span className="font-semibold text-text">{formatDateTime(event.start_time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </SwiperSlide>
        ))}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              className="tr-hero-prev absolute left-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-text/10 bg-surface/85 text-text shadow-lg shadow-black/10 backdrop-blur transition hover:border-brand-600/40 hover:bg-surface md:left-5"
              aria-label="Slide trước"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              className="tr-hero-next absolute right-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-text/10 bg-surface/85 text-text shadow-lg shadow-black/10 backdrop-blur transition hover:border-brand-600/40 hover:bg-surface md:right-5"
              aria-label="Slide tiếp theo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}
      </Swiper>
    </section>
  );
}