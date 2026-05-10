import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import eventService from '@/services/eventService';
import bannerFallback from '@/assets/banner-sample.svg';
import { resolveMediaUrl } from '@/utils/media';
import { formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <section className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-48 w-72 shrink-0 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (error || items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Sự kiện xu hướng</h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={scrollLeft} className="rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={scrollRight} className="rounded-full">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-6 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {items.map((evt, idx) => {
            const rank = Number(evt?.rank) || idx + 1;
            const bannerUrl = resolveMediaUrl(evt?.banner_url) || bannerFallback;
            const canNavigate = isValidUUID(evt?.id);
            const to = canNavigate ? `/events/${evt.slug || evt.id}` : undefined;

            const Wrapper = canNavigate ? Link : 'div';
            const wrapperProps = canNavigate ? { to } : { role: 'button', 'aria-disabled': true };

            return (
              <Wrapper
                key={evt?.id || idx}
                {...wrapperProps}
                className="group relative shrink-0 w-[280px] md:w-[350px] snap-start cursor-pointer"
              >
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
                  <img
                    src={bannerUrl}
                    alt={evt?.title || 'Trending event'}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                  
                  {/* Rank Badge */}
                  <div className="absolute -left-2 -top-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl font-black text-primary-foreground shadow-lg">
                    {rank}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="line-clamp-1 text-lg font-bold text-white">
                      {evt?.title}
                    </h3>
                    {evt?.start_time && (
                      <p className="mt-1 text-xs font-medium text-white/80">
                        {formatDateTime(evt.start_time)}
                      </p>
                    )}
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
}
