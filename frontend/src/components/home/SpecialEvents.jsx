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
        <h2 id="home-special-events-heading" className="sc-76f96852-1 jrVWUy text-xl md:text-3xl font-bold tracking-tight text-foreground">Sự kiện đặc biệt</h2>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="sc-76f96852-2 jdsHaE flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-2 md:gap-3 pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {events.map((event) => (
            <div
              key={event.id}
              className="sc-76f96852-0 jwccPd relative shrink-0 w-[200px] md:w-[300px] aspect-[3/4] snap-start overflow-hidden rounded-xl shadow-lg transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl active:scale-95 group"
            >
              <Link
                to={`/events/${event.slug || event.id}`}
                className="block h-full w-full"
                aria-label={`Xem chi tiết sự kiện đặc biệt ${event.title}`}
              >
                <img
                  src={resolveMediaUrl(event.banner_url) || bannerFallback}
                  alt={`Poster sự kiện đặc biệt ${event.title}`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
