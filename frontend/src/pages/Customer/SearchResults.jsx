import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import eventService from '@/services/eventService';
import { formatDateTime, formatVND } from '@/utils/formatters';
import { resolveMediaUrl } from '@/utils/media';
import bannerFallback from '@/assets/banner-sample.svg';
import { EventCardSkeleton } from '@/components/common/Skeleton';
import EmptyState from '@/components/common/EmptyState';
import { Helmet } from 'react-helmet-async';
import { DatePickerDropdown } from '@/components/common/DatePickerDropdown';
import { AdvancedFiltersSheet } from '@/components/common/AdvancedFiltersSheet';
import { LocationDropdown } from '@/components/common/LocationDropdown';
import { parseISO, format } from 'date-fns';
import { getCategoryLabel } from '@/constants/categories';

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = searchParams.get('q') || '';
  
  // Parse filters from URL
  const filters = useMemo(() => {
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const category = searchParams.get('category');
    const location = searchParams.get('location');

    return {
      dateRange: dateFrom ? {
        from: parseISO(dateFrom),
        to: dateTo ? parseISO(dateTo) : parseISO(dateFrom)
      } : undefined,
      priceRange: [
        minPrice ? parseInt(minPrice, 10) : 0,
        maxPrice ? parseInt(maxPrice, 10) : 10000000
      ],
      categories: category ? category.split(',') : [],
      location: location || undefined
    };
  }, [searchParams]);

  const updateParams = (newParams) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    setSearchParams(params);
  };

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = Object.fromEntries(searchParams.entries());
        const data = await eventService.getEvents(params);
        setEvents(data);
      } catch (err) {
        setError(err?.message || 'Không thể tải kết quả tìm kiếm');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [searchParams]);

  const handleDateApply = (range) => {
    if (range?.from) {
      updateParams({
        date_from: format(range.from, 'yyyy-MM-dd'),
        date_to: range.to ? format(range.to, 'yyyy-MM-dd') : format(range.from, 'yyyy-MM-dd')
      });
    } else {
      updateParams({ date_from: null, date_to: null });
    }
  };

  const handleAdvancedApply = ({ priceRange, categories }) => {
    updateParams({
      min_price: priceRange[0] > 0 ? priceRange[0] : null,
      max_price: priceRange[1] < 10000000 ? priceRange[1] : null,
      category: categories.length > 0 ? categories.join(',') : null
    });
  };

  const handleLocationSelect = (location) => {
    updateParams({ location: location === 'all' ? null : location });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 min-h-[60vh]">
      <Helmet>
        <title>{query ? `Kết quả cho "${query}"` : 'Tìm kiếm sự kiện'} | TicketRush</title>
      </Helmet>

      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Kết quả tìm kiếm
          </h1>
          {query && (
            <p className="text-2xl font-bold mt-1">
              &quot;{query}&quot;
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DatePickerDropdown 
            initialRange={filters.dateRange}
            onApply={handleDateApply}
            onReset={() => updateParams({ date_from: null, date_to: null })}
            className="w-full md:w-auto"
          />
          
          <AdvancedFiltersSheet 
            initialFilters={{
              priceRange: filters.priceRange,
              categories: filters.categories
            }}
            onApply={handleAdvancedApply}
            onReset={() => updateParams({ min_price: null, max_price: null, category: null })}
          />

          <LocationDropdown 
            selectedLocation={filters.location}
            onSelect={handleLocationSelect}
            className="w-full md:w-auto"
          />
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-6 rounded-2xl border border-destructive/20 text-center">
          <p className="font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-sm font-bold underline">
            Thử lại
          </button>
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {events.map((event) => (
            <SearchResultCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Không tìm thấy kết quả"
          description="Chúng tôi không tìm thấy sự kiện nào phù hợp với tìm kiếm của bạn. Thử thay đổi từ khóa hoặc xóa bộ lọc."
          icon="search"
          action={{
            label: "Xem tất cả sự kiện",
            onClick: () => setSearchParams({})
          }}
        />
      )}
    </div>
  );
}

function SearchResultCard({ event }) {
  const imageUrl = resolveMediaUrl(event.banner_url) || bannerFallback;
  // Mock price if not available in data - in a real app this would come from the API
  const price = event.min_price || 500000; 

  return (
    <Link to={`/events/${event.slug || event.id}`} className="group block h-full">
      <Card className="overflow-hidden border-none shadow-none bg-transparent transition-all duration-500 h-full flex flex-col">
        <div className="relative aspect-video overflow-hidden rounded-t-2xl shadow-md">
          <img
            src={imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute top-3 left-3">
            <span className="bg-white/90 backdrop-blur-md text-black text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm">
              {getCategoryLabel(event.category) || 'Sự kiện'}
            </span>
          </div>
          <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500" />
        </div>
        <CardContent className="p-5 space-y-3 bg-card rounded-b-2xl border border-t-0 border-border/50 flex-1 flex flex-col shadow-sm group-hover:shadow-md transition-shadow duration-500">
          <h3 className="font-bold text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-300">
            {event.title}
          </h3>
          
          <div className="flex items-center gap-2 text-muted-foreground mt-auto">
            <Calendar className="h-4 w-4 text-primary/70" />
            <span className="text-xs font-medium">{formatDateTime(event.start_time)}</span>
          </div>
          
          <div className="pt-1">
            <span className="text-primary font-extrabold text-xl tracking-tight">
              {formatVND(price)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
