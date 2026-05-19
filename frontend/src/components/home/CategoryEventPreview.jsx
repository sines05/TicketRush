import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import eventService from '@/services/eventService';
import { CATEGORY_OPTIONS } from '@/constants/categories';
import EventCard from './EventCard';
import { Skeleton } from '@/components/common/Skeleton';

const HOME_CATEGORY_KEYS = [
  'music_festival',
  'arts_stage',
  'sports',
  'education_workshop',
  'experience_entertainment',
];

export default function CategoryEventPreview() {
  const categories = useMemo(
    () => CATEGORY_OPTIONS.filter((category) => HOME_CATEGORY_KEYS.includes(category.key)),
    []
  );
  const [eventsByCategory, setEventsByCategory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchCategoryEvents() {
      setLoading(true);
      try {
        const results = await Promise.all(
          categories.map(async (category) => {
            const events = await eventService.getEvents({ category: category.key });
            return [category.key, Array.isArray(events) ? events.slice(0, 4) : []];
          })
        );

        if (mounted) {
          setEventsByCategory(Object.fromEntries(results));
        }
      } catch {
        if (mounted) {
          setEventsByCategory({});
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchCategoryEvents();

    return () => {
      mounted = false;
    };
  }, [categories]);

  if (!loading && categories.every((category) => !eventsByCategory[category.key]?.length)) {
    return null;
  }

  return (
    <section className="space-y-12" aria-label="Sự kiện theo hạng mục">
      {categories.map((category) => {
        const events = eventsByCategory[category.key] || [];

        if (!loading && events.length === 0) {
          return null;
        }

        return (
          <section key={category.key} className="space-y-5" aria-labelledby={`home-preview-${category.key}`}>
            <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
              <h2
                id={`home-preview-${category.key}`}
                className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl"
              >
                {category.label}
              </h2>

              <Link
                to={`/search?category=${encodeURIComponent(category.key)}`}
                className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-border/80 bg-background px-4 py-2 text-sm font-bold text-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-primary hover:text-primary-foreground"
                aria-label={`Xem thêm sự kiện ${category.label}`}
              >
                Xem thêm
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} aria-hidden="true">
                      <Skeleton className="mb-4 aspect-[16/9] w-full rounded-xl" />
                      <Skeleton className="mb-2 h-6 w-4/5 rounded" />
                      <Skeleton className="h-4 w-1/2 rounded" />
                    </div>
                  ))
                : events.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          </section>
        );
      })}
    </section>
  );
}
