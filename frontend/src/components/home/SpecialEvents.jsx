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
      <section className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="flex gap-6 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-[2/3] w-[200px] md:w-[280px] shrink-0 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (error || events.length === 0) return null;

  return (
    <section className="relative space-y-6 group/section">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase">Sự kiện đặc biệt</h2>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-6 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.slug || event.id}`}
              className="relative shrink-0 w-[200px] md:w-[280px] aspect-[2/3] snap-start overflow-hidden rounded-2xl shadow-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl active:scale-95 group"
            >
              <img
                src={resolveMediaUrl(event.banner_url) || bannerFallback}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-card/80 text-foreground backdrop-blur-md border border-border opacity-0 transition-all duration-300 hover:bg-card group-hover/section:opacity-100 shadow-2xl active:scale-90"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={() => scroll('right')}
          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-card/80 text-foreground backdrop-blur-md border border-border opacity-0 transition-all duration-300 hover:bg-card group-hover/section:opacity-100 shadow-2xl active:scale-90"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}
