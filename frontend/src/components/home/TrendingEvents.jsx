import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import eventService from '@/services/eventService';
import bannerFallback from '@/assets/banner-sample.svg';
import { resolveMediaUrl } from '@/utils/media';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { TRENDING_RANKS } from '@/constants/trendingRanks';

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
    return () => { mounted = false; };
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="space-y-6" aria-labelledby="home-trending-events-heading">
        <h2 id="home-trending-events-heading" className="text-xl md:text-2xl font-bold text-foreground/90 uppercase tracking-tight">Sự kiện xu hướng</h2>
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="shrink-0 w-[280px] md:w-[350px] aspect-[1.8/1] bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (error || items.length === 0) return null;

  return (
    <section className="space-y-6 group/section" aria-labelledby="home-trending-events-heading">
      <div className="flex items-center justify-between">
        <h2 id="home-trending-events-heading" className="text-xl md:text-2xl font-bold text-foreground/90 uppercase tracking-tight">Sự kiện xu hướng</h2>
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => scroll('left')} className="h-10 w-10 rounded-full bg-white shadow-md border border-border hover:bg-muted">
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => scroll('right')} className="h-10 w-10 rounded-full bg-white shadow-md border border-border hover:bg-muted">
            <ChevronRight className="h-5 w-5 text-foreground" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-6 md:gap-8 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {items.map((evt, idx) => {
            const bannerUrl = resolveMediaUrl(evt?.banner_url) || bannerFallback;
            const svgRank = TRENDING_RANKS[idx] || '';

            return (
              <Link
                key={evt?.id || idx}
                to={`/events/${evt.slug || evt.id}`}
                className="group relative shrink-0 w-[280px] md:w-[350px] snap-start"
              >
                {/* Image Card Container */}
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-card shadow-sm border border-border/50 transition-all duration-500 group-hover:shadow-xl group-hover:border-primary/30 z-10">
                  <img
                    src={bannerUrl}
                    alt={evt?.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-70 group-hover:opacity-60 transition-opacity" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-4 pl-16">
                    <h3 className="line-clamp-1 text-sm md:text-base font-bold text-white uppercase tracking-tight">
                      {evt?.title}
                    </h3>
                  </div>
                </div>

                {/* Ranking SVG - Positioned bottom-left, partially overlapping */}
                <div 
                  className="absolute bottom-[-10px] left-[-15px] z-20 transition-transform duration-500 group-hover:scale-110 pointer-events-none"
                  style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}
                  dangerouslySetInnerHTML={{ __html: svgRank }}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
