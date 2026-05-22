import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEventDetail } from '../../hooks/useEventDetail.js';
import Loading from '../../components/common/Loading.jsx';
import Button from '../../components/common/Button.jsx';
import { resolveMediaUrl } from '../../utils/media.js';
import { formatDateTime, formatVND } from '../../utils/formatters.js';
import OSMLocation from '../../components/Maps/OSMLocation';
import { MapPin } from 'lucide-react';

// Modular Sections
import HeroSection from '../../components/EventDetail/HeroSection.jsx';
import IntroductionSection from '../../components/EventDetail/IntroductionSection.jsx';
import ScheduleSection from '../../components/EventDetail/ScheduleSection.jsx';
import OrganizerSection from '../../components/EventDetail/OrganizerSection.jsx';
import StickyActionBar from '../../components/EventDetail/StickyActionBar.jsx';
import RecommendationsSection from '../../components/EventDetail/RecommendationsSection.jsx';
import ReviewSection from '../../components/EventDetail/ReviewSection.jsx';

/**
 * EventDetail Page
 *
 * Restructured to use modular components and a custom hook for logic.
 * Implements a modern, glassmorphic design with sticky action bar.
 */
export default function EventDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  const {
    event,
    seatMap,
    reviews,
    loading,
    error,
    minPrice,
    recommendedEvents,
    reviewMutation,
    reviewsLoading,
    handleReviewSubmit,
    rating,
    setRating,
    comment,
    setComment
  } = useEventDetail(slug, location.key);

  // Intersection Observer for Sticky Action Bar
  useEffect(() => {
    const currentHeroRef = heroRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky bar when hero is NOT visible (scrolled past)
        setIsStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (currentHeroRef) {
      observer.observe(currentHeroRef);
    }

    return () => {
      if (currentHeroRef) {
        observer.unobserve(currentHeroRef);
      }
    };
  }, [loading, event]);

  // Map backend snake_case to component camelCase
  const mappedEvent = useMemo(() => {
    if (!event) return null;
    return {
      ...event,
      startTime: event.start_time,
      endTime: event.end_time,
      locationName: event.location,
      locationAddress: event.address,
      posterUrl: resolveMediaUrl(event.banner_url),
    };
  }, [event]);

  const isPast = useMemo(() => {
    if (!mappedEvent) return false;
    return new Date(mappedEvent.endTime || mappedEvent.startTime) < new Date();
  }, [mappedEvent]);

  const showtimes = useMemo(() => {
    if (!event) return [];
    // If backend doesn't provide multiple showtimes yet, use the main start_time
    return event.showtimes || [{ id: event.id, startTime: event.start_time }];
  }, [event]);

  const handleBuyTickets = () => {
    if (isPast) return;
    navigate(`/booking/queue?eventId=${event.id}`);
  };

  if (loading) return <Loading title="Đang tải chi tiết..." />;

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <h2 className="text-2xl font-bold mb-4">Không tìm thấy sự kiện</h2>
        <Button onClick={() => navigate('/')}>Về trang chủ</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Helmet>
        <title>{event.title} | TicketRush</title>
        <meta name="description" content={event.description?.substring(0, 160)} />
        <meta property="og:title" content={`${event.title} - Mua vé ngay tại TicketRush`} />
        <meta property="og:description" content={`Diễn ra vào ${formatDateTime(event.start_time)} tại ${event.location}.`} />
        <meta property="og:image" content={resolveMediaUrl(event.banner_url)} />
      </Helmet>

      <StickyActionBar
        event={mappedEvent}
        isVisible={isStickyVisible}
        onBuyTickets={handleBuyTickets}
        minPrice={minPrice}
        isPast={isPast}
      />

      <HeroSection
        ref={heroRef}
        event={mappedEvent}
        minPrice={minPrice}
        onBuyTickets={handleBuyTickets}
        isPast={isPast}
      />

      <div className="container mx-auto px-4 py-10 space-y-8">
        {error && (
          <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            <IntroductionSection event={mappedEvent} />
            <ScheduleSection
              event={mappedEvent}
              showtimes={showtimes}
              onBuyTickets={handleBuyTickets}
              isPast={isPast}
            />

            <ReviewSection
              reviews={reviews}
              reviewsLoading={reviewsLoading}
              reviewMutation={reviewMutation}
              handleReviewSubmit={handleReviewSubmit}
              rating={rating}
              setRating={setRating}
              comment={comment}
              setComment={setComment}
            />
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            {/* Zones & Prices */}
            <section className="bg-white dark:bg-slate-900 rounded-[32px] border border-white/60 dark:border-white/10 p-7 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-sm">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-brand-600" />
                Khu vực & Giá
              </h2>
              <div className="space-y-3">
                {(seatMap?.zones ?? []).map((z) => (
                  <div
                    key={z.zone_id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 p-4 transition-all hover:border-brand-600/40 hover:translate-x-1"
                  >
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{z.name}</div>
                      <div className="mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sơ đồ ghế</div>
                    </div>
                    <div className="text-base font-black text-brand-600">{formatVND(z.price)}</div>
                  </div>
                ))}
                {(seatMap?.zones ?? []).length === 0 && (
                  <div className="text-sm text-muted-foreground italic text-center py-4">Đang cập nhật giá vé...</div>
                )}
              </div>
              <Button 
                className="w-full h-14 rounded-2xl text-base font-black uppercase tracking-widest shadow-lg shadow-brand-600/20" 
                onClick={handleBuyTickets}
                disabled={isPast}
              >
                {isPast ? 'Sự kiện đã kết thúc' : 'Mua vé ngay'}
              </Button>
            </section>

            <OrganizerSection event={mappedEvent} />

            {/* Location / Map */}
            <section className="bg-white dark:bg-slate-900 rounded-[32px] border border-white/60 dark:border-white/10 p-7 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-brand-600" />
                Địa điểm
              </h2>

              <div className="space-y-4">
                {/* Province badge */}
                {event.location && (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-brand-600/30 bg-brand-600/10 px-4 py-2 text-xs font-black text-brand-600 uppercase tracking-wider">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.location}
                  </div>
                )}

                {/* Address detail */}
                {event.address && (
                  <div className="flex gap-3 text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                    <MapPin className="h-5 w-5 mt-0.5 shrink-0 text-brand-600" />
                    <span>{event.address}</span>
                  </div>
                )}
              </div>

              {/* Map */}
              {event.latitude && event.longitude && (
                <div className="h-[280px] w-full overflow-hidden rounded-[24px] border border-slate-200 dark:border-white/10 relative z-0 isolate shadow-inner mt-4">
                  <OSMLocation
                    initialLocation={{ lat: event.latitude, lng: event.longitude }}
                    readOnly={true}
                  />
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <RecommendationsSection events={recommendedEvents} />
    </div>
  );
}
