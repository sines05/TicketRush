import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import eventService from '@/services/eventService';
import bannerFallback from '@/assets/banner-sample.svg';
import { resolveMediaUrl } from '@/utils/media';
import { formatVND } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Skeleton } from '@/components/common/Skeleton';


export default function TrendingEvents() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    eventService
      .getTrendingEvents(10)
      .then((data) => {
        if (!mounted) return;
        setItems(Array.isArray(data) ? data : []);
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

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="shrink-0 w-[280px] md:w-[400px]">
              <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || items.length === 0) return null;

  return (
    <section className="space-y-8 group/section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase italic">Sự kiện xu hướng</h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => scroll('left')} className="rounded-full bg-white/5 hover:bg-white/10 text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => scroll('right')} className="rounded-full bg-white/5 hover:bg-white/10 text-foreground">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-8 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {items.map((evt, idx) => {
            const rank = idx + 1;
            const bannerUrl = resolveMediaUrl(evt?.banner_url) || bannerFallback;

            return (
              <Link
                key={evt?.id || idx}
                to={`/events/${evt.slug || evt.id}`}
                className="group relative shrink-0 w-[300px] md:w-[450px] snap-start flex items-center gap-4"
              >
                {/* Ranking Number */}
                <span className="text-7xl md:text-8xl font-black text-teal-400 italic opacity-80 select-none -mr-4 md:-mr-6 z-10 drop-shadow-[0_4px_8px_rgba(45,212,191,0.4)]">
                  {rank}
                </span>

                <div className="relative flex-1 aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl transition-all duration-500 group-hover:border-teal-400/50">
                  <img
                    src={bannerUrl}
                    alt={evt?.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="line-clamp-1 text-lg font-bold text-white uppercase tracking-tight group-hover:text-teal-300 transition-colors">
                      {evt?.title}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-primary">
                      {formatVND(evt.min_price || 0)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
