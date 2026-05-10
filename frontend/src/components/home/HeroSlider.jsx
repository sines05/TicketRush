import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import bannerFallback from '@/assets/banner-sample.svg';
import { getCategoryLabel } from '@/constants/categories';
import eventService from '@/services/eventService';
import { formatDateTime } from '@/utils/formatters';
import { resolveMediaUrl } from '@/utils/media';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Ticket } from 'lucide-react';

const isValidUUID = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default function HeroSlider() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    eventService
      .getFeaturedEvents()
      .then((data) => {
        if (!mounted) return;
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Không tải được banner nổi bật');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const slides = useMemo(() => events.slice(0, 5), [events]);

  if (loading) {
    return (
      <section className="overflow-hidden rounded-3xl border bg-card shadow-lg">
        <div className="grid min-h-[22rem] gap-0 md:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-pulse bg-muted" />
          <div className="space-y-4 p-6 md:p-8">
            <div className="h-4 w-32 rounded-full bg-muted" />
            <div className="h-10 w-4/5 rounded-lg bg-muted" />
            <div className="h-4 w-full rounded-full bg-muted" />
            <div className="h-4 w-5/6 rounded-full bg-muted" />
            <div className="mt-8 h-12 w-40 rounded-lg bg-muted" />
          </div>
        </div>
      </section>
    );
  }

  if (error || slides.length === 0) {
    return null;
  }

  return (
    <section className="group relative overflow-hidden rounded-[2rem] border-none shadow-2xl glass-surface glass-border">
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        autoplay={{ delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        loop={slides.length > 1}
        navigation={{ nextEl: '.hero-next', prevEl: '.hero-prev' }}
        pagination={{ 
          clickable: true,
          el: '.hero-pagination',
          bulletClass: 'inline-block w-3 h-3 rounded-full bg-white/20 mx-2 cursor-pointer transition-all duration-500 hover:bg-white/40 hover:scale-110',
          bulletActiveClass: '!bg-white !w-12 !rounded-full'
        }}
        className="relative"
      >
        {slides.map((event) => (
          <SwiperSlide key={event.id}>
            <article className="relative isolate min-h-[30rem] overflow-hidden md:min-h-[35rem]">
              <img
                src={resolveMediaUrl(event.banner_url) || bannerFallback}
                alt={event.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[10s] group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
              
              <div className="relative z-10 flex h-full min-h-[30rem] items-center md:min-h-[35rem]">
                <div className="w-full px-8 py-16 md:px-16">
                  <div className="max-w-3xl space-y-8">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-foreground backdrop-blur-xl border border-primary/30 animate-fade-in">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                      Sự kiện nổi bật • {getCategoryLabel(event.category)}
                    </div>

                    <h2 className="text-5xl font-extrabold tracking-tighter text-white sm:text-7xl lg:text-8xl animate-fade-in-up">
                      {event.title}
                    </h2>

                    <p className="max-w-xl text-xl text-white/90 line-clamp-2 leading-relaxed animate-fade-in-up delay-100">
                      {event.description || 'Trải nghiệm những khoảnh khắc tuyệt vời cùng TicketRush.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-white animate-fade-in-up delay-200">
                      <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-md border border-white/10">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span>{formatDateTime(event.start_time)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-5 pt-6 animate-fade-in-up delay-300">
                      <Button asChild size="xl" className="rounded-full px-10 font-bold shadow-xl shadow-primary/30">
                        <Link to={`/events/${event.slug || event.id}`}>
                          Xem chi tiết
                        </Link>
                      </Button>
                      
                      {isValidUUID(event.id) && (
                        <Button asChild variant="outline" size="xl" className="rounded-full border-white/30 bg-white/5 text-white hover:bg-white/20 hover:text-white backdrop-blur-xl px-10 font-bold">
                          <Link to={`/booking/queue?eventId=${event.id}`}>
                            <Ticket className="mr-2 h-5 w-5" />
                            Mua vé ngay
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </SwiperSlide>
        ))}

        {slides.length > 1 && (
          <>
            <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 hero-pagination" />
            
            <button
              type="button"
              className="hero-prev absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white opacity-0 transition-all duration-300 hover:bg-black/40 group-hover:opacity-100 md:left-8"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              type="button"
              className="hero-next absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white opacity-0 transition-all duration-300 hover:bg-black/40 group-hover:opacity-100 md:right-8"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </Swiper>
    </section>
  );
}
