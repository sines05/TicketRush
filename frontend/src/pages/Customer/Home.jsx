import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Loading from '../../components/common/Loading.jsx';
import eventService from '../../services/eventService.js';
import { formatDateTime } from '../../utils/formatters.js';
import bannerFallback from '../../assets/banner-sample.svg';
import { getCategoryKey, getCategoryLabel, CATEGORY_ALL } from '../../constants/categories.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim().toLowerCase();
  const activeCategory = searchParams.get('category') || CATEGORY_ALL;
  const activeCategoryLabel = getCategoryLabel(activeCategory);

  const filtered = useMemo(() => {
    const paramsCategory = (searchParams.get('category') || '').trim();
    const paramsCategoryKey = paramsCategory ? getCategoryKey(paramsCategory) : '';

    let out = events;
    if (paramsCategoryKey && paramsCategoryKey !== CATEGORY_ALL) {
      out = out.filter((evt) => getCategoryKey(evt?.category) === paramsCategoryKey);
    }

    if (!query) return out;
    return out.filter((evt) => {
      const title = String(evt?.title || '').toLowerCase();
      const desc = String(evt?.description || '').toLowerCase();
      return title.includes(query) || desc.includes(query);
    });
  }, [events, query, searchParams]);

  useEffect(() => {
    let mounted = true;

    eventService
      .getEvents()
      .then((data) => {
        if (!mounted) return;
        setEvents(data);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Không tải được danh sách sự kiện');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <Loading title="Đang tải sự kiện..." />;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-text/10 bg-surface p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-600/15 to-warning/15" />
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="relative">
            <h1 className="text-lg font-semibold">Sự kiện nổi bật</h1>
            <p className="mt-1 text-sm text-muted">
              Demo UI TicketRush • {USE_MOCK ? 'Đang dùng mock' : 'Đang dùng API backend'}
            </p>
            {(query || activeCategory !== CATEGORY_ALL) && (
              <p className="mt-2 text-xs text-muted">
                {query && (
                  <>
                    Tìm kiếm: <span className="font-semibold text-text">{searchParams.get('q')}</span>
                  </>
                )}
                {query && activeCategory !== CATEGORY_ALL && <span className="mx-2">•</span>}
                {activeCategory !== CATEGORY_ALL && (
                  <>
                    Thể loại: <span className="font-semibold text-text">{activeCategoryLabel}</span>
                  </>
                )}
              </p>
            )}
          </div>
          <Link to="/admin/events/new">
            <Button variant="secondary">Tạo sự kiện (Admin)</Button>
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((evt) => (
          <article
            key={evt.id}
            className="tr-event-card group overflow-hidden rounded-2xl border border-text/10 bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-brand-600/35 hover:ring-2 hover:ring-brand-600/15"
          >
            <div className="relative">
              <img
                src={evt.banner_url || bannerFallback}
                alt={evt.title}
                className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            </div>
            <div className="space-y-3 p-4">
              <div>
                <div className="text-base font-semibold tracking-tight text-text md:text-lg">
                  {evt.title}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-muted">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  <span>{formatDateTime(evt.start_time)}</span>
                </div>
              </div>

              <div className="text-sm text-muted overflow-hidden">{evt.description}</div>

              <div className="flex items-center justify-end">
                <Link to={`/events/${evt.id}`}>
                  <Button size="sm">Xem chi tiết</Button>
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      {!error && filtered.length === 0 && (
        <div className="rounded-2xl border border-text/10 bg-surface p-5 text-sm text-muted">
          Không có sự kiện phù hợp.
        </div>
      )}
    </div>
  );
}
