import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEventDetail } from '../../hooks/useEventDetail.js';
import Loading from '../../components/common/Loading.jsx';
import Button from '../../components/common/Button.jsx';
import { resolveMediaUrl } from '../../utils/media.js';
import { formatDateTime, formatVND } from '../../utils/formatters.js';
import OSMLocation from '../../components/Maps/OSMLocation';

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

  const showtimes = useMemo(() => {
    if (!event) return [];
    // If backend doesn't provide multiple showtimes yet, use the main start_time
    return event.showtimes || [{ id: event.id, startTime: event.start_time }];
  }, [event]);

  const handleBuyTickets = () => {
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
      />

      <HeroSection
        ref={heroRef}
        event={mappedEvent}
        minPrice={minPrice}
        onBuyTickets={handleBuyTickets}
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
            <section className="bg-surface/50 rounded-2xl glass-border p-6 space-y-6">
              <h2 className="text-xl font-bold text-brand-600">Khu vực & Giá</h2>
              <div className="space-y-3">
                {(seatMap?.zones ?? []).map((z) => (
                  <div
                    key={z.zone_id}
                    className="flex items-center justify-between rounded-xl glass-border bg-background/30 p-4 transition hover:border-brand-600/30"
                  >
                    <div>
                      <div className="text-sm font-bold">{z.name}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wider">Sơ đồ ghế</div>
                    </div>
                    <div className="text-sm font-bold text-brand-600">{formatVND(z.price)}</div>
                  </div>
                ))}
                {(seatMap?.zones ?? []).length === 0 && (
                  <div className="text-sm text-muted-foreground italic">Đang cập nhật giá vé...</div>
                )}
              </div>
              <Button className="w-full py-4" onClick={handleBuyTickets}>
                Mua vé ngay
              </Button>
            </section>

            <OrganizerSection event={mappedEvent} />

            {/* Location / Map */}
            <section className="bg-surface/50 rounded-2xl glass-border p-6 space-y-6">
              <h2 className="text-xl font-bold text-brand-600">Địa điểm</h2>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {event.address || event.location}
                </p>
                {event.latitude && event.longitude && (
                  <div className="h-[300px] w-full overflow-hidden rounded-xl glass-border">
                    <OSMLocation
                      initialLocation={{ lat: event.latitude, lng: event.longitude }}
                      readOnly={true}
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <RecommendationsSection events={recommendedEvents} />
    </div>
  );
}
