import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import eventService from '@/services/eventService';
import EventCard from './EventCard';
import { Skeleton } from '@/components/common/Skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { endOfMonth, startOfWeek, endOfWeek, addDays, format } from 'date-fns';

export default function EventListWithTabs({ categoryKey, title }) {
  const [activeTab, setActiveTab] = useState('weekend'); // 'weekend' | 'month'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const dateFilter = useMemo(() => {
    const now = new Date();
    if (activeTab === 'weekend') {
      // Logic for this weekend: Saturday to Sunday
      const saturday = addDays(startOfWeek(now, { weekStartsOn: 1 }), 5); // Saturday
      const sunday = endOfWeek(now, { weekStartsOn: 1 });
      return {
        date_from: format(saturday, 'yyyy-MM-dd'),
        date_to: format(sunday, 'yyyy-MM-dd')
      };
    } else {
      // Logic for this month (from today onwards)
      return {
        date_from: format(now, 'yyyy-MM-dd'),
        date_to: format(endOfMonth(now), 'yyyy-MM-dd')
      };
    }
  }, [activeTab]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    eventService
      .getEvents({
        category: categoryKey,
        ...dateFilter
      })
      .then((data) => {
        if (!mounted) return;
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!mounted) return;
        console.error(e?.message || 'Không tải được danh sách sự kiện');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [categoryKey, dateFilter]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!loading && events.length === 0) return null;

  const headingId = `home-category-${categoryKey}-heading`;
  const weekendTabId = `home-category-${categoryKey}-weekend-tab`;
  const monthTabId = `home-category-${categoryKey}-month-tab`;
  const panelId = `home-category-${categoryKey}-panel`;

  return (
    <section className="space-y-6 group/section" aria-labelledby={headingId}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-4">
          <h2 id={headingId} className="text-2xl font-bold tracking-tight text-foreground uppercase">{title}</h2>
          
          <div className="flex items-center gap-8" role="tablist" aria-label={`Lọc sự kiện ${title} theo thời gian`}>
            <button
              id={weekendTabId}
              type="button"
              role="tab"
              aria-selected={activeTab === 'weekend'}
              aria-controls={panelId}
              onClick={() => setActiveTab('weekend')}
              className={cn(
                "relative pb-2 text-sm font-bold transition-colors uppercase tracking-widest",
                activeTab === 'weekend' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Cuối tuần này
              {activeTab === 'weekend' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in slide-in-from-left-2" aria-hidden="true" />
              )}
            </button>
            <button
              id={monthTabId}
              type="button"
              role="tab"
              aria-selected={activeTab === 'month'}
              aria-controls={panelId}
              onClick={() => setActiveTab('month')}
              className={cn(
                "relative pb-2 text-sm font-bold transition-colors uppercase tracking-widest",
                activeTab === 'month' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tháng này
              {activeTab === 'month' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in slide-in-from-left-2" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to={`/search?category=${categoryKey}`}
            className="group/link flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
            aria-label={`Xem thêm sự kiện ${title}`}
          >
            Xem thêm
            <ChevronRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" aria-hidden="true" />
          </Link>
          
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => scroll('left')} className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted text-foreground" aria-label={`Cuộn danh sách ${title} sang trái`}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => scroll('right')} className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted text-foreground" aria-label={`Cuộn danh sách ${title} sang phải`}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={activeTab === 'weekend' ? weekendTabId : monthTabId}
          aria-busy={loading}
          ref={scrollRef}
          className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-6 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[280px] md:w-[320px]" aria-hidden="true">
                <Skeleton className="aspect-[16/9] w-full rounded-xl mb-4" />
                <Skeleton className="h-6 w-4/5 rounded mb-2" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
            ))
          ) : (
            events.map((event) => (
              <div key={event.id} className="shrink-0 w-[280px] md:w-[320px] snap-start">
                <EventCard event={event} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
