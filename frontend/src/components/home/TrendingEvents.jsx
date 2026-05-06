import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import eventService from '../../services/eventService.js';
import bannerFallback from '../../assets/banner-sample.svg';
import { resolveMediaUrl } from '../../utils/media.js';
import { formatDateTime } from '../../utils/formatters.js';

const isValidUUID = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default function TrendingEvents() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    eventService
      .getTrendingEvents(5)
      .then((data) => {
        if (!mounted) return;
        setItems(Array.isArray(data) ? data.slice(0, 5) : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Không tải được danh sách trending');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="h-4 w-44 rounded-full bg-text/10" />
        <div className="mt-4 flex gap-6 overflow-hidden">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-40 w-64 shrink-0 animate-pulse rounded-xl bg-text/10" />
          ))}
        </div>
      </section>
    );
  }

  if (error || items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Sự kiện xu hướng</h2>
          <p className="mt-1 text-sm text-muted">Top 5 đang được quan tâm gần đây</p>
        </div>
      </div>

      <div className="relative">
        {/* Carousel Container */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-8 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {items.map((evt, idx) => {
            const rank = Number(evt?.rank) || idx + 1;
            const bannerUrl = resolveMediaUrl(evt?.banner_url) || bannerFallback;
            const canNavigate = isValidUUID(evt?.id);
            const to = canNavigate ? `/booking/queue?eventId=${evt.id}` : undefined;

            const Wrapper = canNavigate ? Link : 'div';
            const wrapperProps = canNavigate ? { to } : { role: 'button', 'aria-disabled': true, title: 'ID sự kiện không hợp lệ' };

            return (
              <Wrapper
                key={evt?.id || idx}
                {...wrapperProps}
                className="relative shrink-0 w-[280px] md:w-[320px] snap-start group cursor-pointer pl-6"
              >
                {/* Hollow Stroke Ranking Number */}
                <span
                  className="absolute -left-6 bottom-4 z-10 text-[100px] md:text-[120px] font-black italic leading-none text-transparent [-webkit-text-stroke:2px_#4ebdd5]"
                  aria-hidden="true"
                >
                  {rank}
                </span>

                {/* Card Content */}
                <div className="relative">
                  <img
                    src={bannerUrl}
                    alt={evt?.title || 'Trending event'}
                    loading="lazy"
                    className="w-full aspect-video object-cover rounded-xl shadow-md grayscale-[50%] brightness-75 transition-all duration-500 group-hover:grayscale-0 group-hover:brightness-110 group-hover:scale-105 group-hover:shadow-2xl"
                  />

                  <div className="mt-3 min-w-0">
                    <div className="line-clamp-2 text-sm font-semibold text-text">{evt?.title}</div>
                    {evt?.start_time && (
                      <div className="mt-1 text-xs text-muted">{formatDateTime(evt.start_time)}</div>
                    )}
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>

        {/* Left Arrow Button */}
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-brand/80 hover:bg-brand text-white p-2 rounded-full shadow-lg transition-all duration-300 hidden md:flex items-center justify-center"
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right Arrow Button */}
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-brand/80 hover:bg-brand text-white p-2 rounded-full shadow-lg transition-all duration-300 hidden md:flex items-center justify-center"
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
}
