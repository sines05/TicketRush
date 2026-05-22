import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import eventService from '@/services/eventService';
import { resolveMediaUrl } from '@/utils/media';
import bannerFallback from '@/assets/banner-sample.svg';
import { Skeleton } from '@/components/common/Skeleton';

export default function SpecialEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    eventService
      .getFeaturedEvents(10)
      .then((data) => {
        if (!mounted) return;
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Không tải được sự kiện đặc biệt');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="space-y-4 sc-76f96852-3 jXikDV" aria-labelledby="home-special-events-heading" aria-busy="true">
        <h2 id="home-special-events-heading" className="sr-only">Sự kiện đặc biệt</h2>
        <p className="sr-only" role="status">Đang tải sự kiện đặc biệt</p>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="flex gap-2 md:gap-3 overflow-hidden sc-76f96852-2 jdsHaE">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] w-[200px] md:w-[300px] shrink-0 rounded-xl" aria-hidden="true" />
          ))}
        </div>
      </section>
    );
  }

  if (error || events.length === 0) return null;

  return (
    <section className="relative space-y-6 group/section sc-76f96852-3 jXikDV" aria-labelledby="home-special-events-heading">
      <div className="flex items-center justify-between">
        <h2 id="home-special-events-heading" className="sc-76f96852-1 jrVWUy text-xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Sự kiện đặc biệt</h2>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="sc-76f96852-2 jdsHaE flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-4 md:gap-6 pb-10 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {events.map((event) => (
            <div
              key={event.id}
              className="sc-76f96852-0 jwccPd relative shrink-0 w-[200px] md:w-[320px] aspect-[3/4.2] snap-start overflow-hidden rounded-[24px] shadow-[0_15px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-2 group"
            >
              <Link
                to={`/events/${event.slug || event.id}`}
                className="block h-full w-full"
                aria-label={`Xem chi tiết sự kiện đặc biệt ${event.title}`}
              >
                <img
                  src={resolveMediaUrl(event.banner_url) || bannerFallback}
                  alt={`Poster sự kiện đặc biệt ${event.title}`}
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-6 left-6 right-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="text-lg font-black text-white leading-tight line-clamp-2 drop-shadow-md">
                    {event.title}
                  </h3>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute -left-6 top-1/2 z-20 -translate-y-1/2 hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-zinc-900 hover:bg-white shadow-lg border border-zinc-200/50 transition-all duration-300 hover:scale-105 active:scale-90"
          aria-label="Cuộn danh sách sự kiện đặc biệt sang trái"
        >
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute -right-6 top-1/2 z-20 -translate-y-1/2 hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-zinc-900 hover:bg-white shadow-lg border border-zinc-200/50 transition-all duration-300 hover:scale-105 active:scale-90"
          aria-label="Cuộn danh sách sự kiện đặc biệt sang phải"
        >
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
