import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Loading from '@/components/common/Loading';
import eventService from '@/services/eventService';
import { getCategoryKey, getCategoryLabel, CATEGORY_ALL } from '@/constants/categories';
import EventCard from '@/components/home/EventCard';
import { Search, Plus, X } from 'lucide-react';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export default function Home() {
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const query = (searchParams.get('q') || '').trim().toLowerCase();
  const activeCategory = searchParams.get('category') || CATEGORY_ALL;
  const activeCategoryLabel = getCategoryLabel(activeCategory);

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

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
    setLoading(true);
    setError('');

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
    // Re-fetch on every navigation to this page
  }, [location.key]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('q', searchInput.trim());
    } else {
      params.delete('q');
    }
    navigate(`?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchInput('');
    navigate('/');
  };

  if (loading) return <Loading title="Đang tải sự kiện..." />;

  const isSearchingOrFiltering = query || activeCategory !== CATEGORY_ALL;

  return (
    <div className="space-y-10 pb-10">
      {/* Hero Section - Only show when searching or filtering to avoid redundancy with HeroSlider */}
      {isSearchingOrFiltering ? (
        <section className="relative overflow-hidden rounded-3xl bg-primary/5 px-6 py-10 md:px-10 md:py-16">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {query ? (
                <>Kết quả cho "<span className="text-primary">{query}</span>"</>
              ) : (
                <>Khám phá <span className="text-primary">{activeCategoryLabel}</span></>
              )}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {filtered.length} sự kiện được tìm thấy phù hợp với yêu cầu của bạn.
            </p>
            
            <div className="mt-8 flex flex-wrap gap-2">
              {query && (
                <Button variant="secondary" size="sm" onClick={() => {
                  setSearchInput('');
                  const p = new URLSearchParams(searchParams);
                  p.delete('q');
                  navigate(`?${p.toString()}`);
                }} className="rounded-full">
                  Tìm kiếm: {query} <X className="ml-2 h-3 w-3" />
                </Button>
              )}
              {activeCategory !== CATEGORY_ALL && (
                <Button variant="secondary" size="sm" onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.delete('category');
                  navigate(`?${p.toString()}`);
                }} className="rounded-full">
                  Thể loại: {activeCategoryLabel} <X className="ml-2 h-3 w-3" />
                </Button>
              )}
              {isSearchingOrFiltering && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-full">
                  Xóa tất cả
                </Button>
              )}
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        </section>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tất cả sự kiện</h2>
            <p className="text-muted-foreground">Khám phá những sự kiện mới nhất tại TicketRush</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <form onSubmit={handleSearch}>
                <Input
                  type="text"
                  placeholder="Tìm kiếm..."
                  className="pl-10 w-[200px] lg:w-[300px]"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </form>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/events/new">
                <Plus className="mr-2 h-4 w-4" />
                Tạo sự kiện
              </Link>
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Events Grid */}
      {filtered.length > 0 ? (
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((evt) => (
            <EventCard key={evt.id} event={evt} />
          ))}
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed p-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Không tìm thấy sự kiện</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc của bạn.
          </p>
          <Button 
            variant="link" 
            onClick={clearFilters}
            className="mt-2"
          >
            Xóa tất cả bộ lọc
          </Button>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-10">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-medium">
          {USE_MOCK ? 'Mock Data' : 'Live API'}
        </span>
        <span>•</span>
        <span>TicketRush Demo UI</span>
      </div>
    </div>
  );
}
