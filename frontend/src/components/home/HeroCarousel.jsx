import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Autoplay, Pagination, Navigation } from 'swiper/modules';
import { PlayCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveMediaUrl } from '@/utils/media';
import bannerFallback from '@/assets/banner-sample.svg';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

/**
 * HeroCarousel Component
 * 
 * A modern, high-fidelity carousel for featured events.
 * Displays 2 slides per view on desktop and 1 on mobile.
 * 
 * @param {Object} props
 * @param {Array} props.events - List of event objects to display
 */
export default function HeroCarousel({ events = [] }) {
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  if (!events || events.length === 0) return null;

  return (
    <section className="group relative w-full max-w-[1536px] mx-auto px-4 py-6 md:px-6" aria-labelledby="home-hero-heading">
      <h1 id="home-hero-heading" className="sr-only">
        Sự kiện nổi bật trên TicketRush
      </h1>
      <Swiper
        modules={[A11y, Autoplay, Pagination, Navigation]}
        aria-label="Băng chuyền sự kiện nổi bật"
        spaceBetween={16}
        slidesPerView={1}
        loop={events.length > 1}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{
          clickable: true,
          el: '.hero-carousel-pagination',
          bulletClass: 'inline-block w-2 h-2 rounded-full bg-white/40 mx-1 cursor-pointer transition-all duration-300',
          bulletActiveClass: '!bg-primary !w-6',
        }}
        a11y={{
          enabled: true,
          prevSlideMessage: 'Chuyển đến sự kiện nổi bật trước',
          nextSlideMessage: 'Chuyển đến sự kiện nổi bật tiếp theo',
          firstSlideMessage: 'Đây là sự kiện đầu tiên',
          lastSlideMessage: 'Đây là sự kiện cuối cùng',
          paginationBulletMessage: 'Chuyển đến sự kiện nổi bật số {{index}}',
        }}
        navigation={{
          prevEl: prevRef.current,
          nextEl: nextRef.current,
        }}
        onBeforeInit={(swiper) => {
          swiper.params.navigation.prevEl = prevRef.current;
          swiper.params.navigation.nextEl = nextRef.current;
        }}
        breakpoints={{
          1024: {
            slidesPerView: 2,
          },
        }}
        className="relative h-[250px] sm:h-[350px] md:h-[400px] lg:h-[450px]"
      >
        {events.map((event, index) => (
          <SwiperSlide key={event.id} aria-label={`Sự kiện nổi bật ${index + 1} trong ${events.length}: ${event.title}`}>
            <div className="relative h-full w-full overflow-hidden rounded-[2rem] shadow-lg">
              <img
                src={resolveMediaUrl(event.banner_url) || bannerFallback}
                alt={`Ảnh banner sự kiện ${event.title}`}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              
              {/* Subtle dark gradients for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
              
              {/* Bottom-left: "Xem chi tiết" CTA */}
              <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8">
                <Link
                  to={`/events/${event.slug || event.id}`}
                  className="inline-block rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-black transition-all hover:bg-white/90 hover:shadow-lg active:scale-95 md:px-8 md:py-3 md:text-base"
                  aria-label={`Xem chi tiết sự kiện ${event.title}`}
                >
                  Xem chi tiết
                </Link>
              </div>

              {/* Bottom-right: Decorative Play icon */}
              <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8" aria-hidden="true">
                <PlayCircle className="h-10 w-10 text-white/80 md:h-12 md:w-12" aria-hidden="true" />
              </div>

              {/* Event Title Overlay (Optional, but good for UX) */}
              <div className="absolute left-6 top-6 max-w-[80%] md:left-8 md:top-8">
                <h3 className="text-xl font-bold text-white drop-shadow-md line-clamp-1 md:text-2xl lg:text-3xl">
                  {event.title}
                </h3>
              </div>
            </div>
          </SwiperSlide>
        ))}

        {/* Custom Navigation Arrows */}
        <button
          ref={prevRef}
          type="button"
          className="hero-carousel-prev absolute left-2 top-1/2 z-20 flex h-12 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-card/80 text-foreground opacity-0 transition-all duration-300 hover:bg-card group-hover:opacity-100 md:left-4 md:h-16 md:w-10"
          aria-label="Chuyển đến sự kiện nổi bật trước"
        >
          <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" aria-hidden="true" />
        </button>

        <button
          ref={nextRef}
          type="button"
          className="hero-carousel-next absolute right-2 top-1/2 z-20 flex h-12 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-card/80 text-foreground opacity-0 transition-all duration-300 hover:bg-card group-hover:opacity-100 md:right-4 md:h-16 md:w-10"
          aria-label="Chuyển đến sự kiện nổi bật tiếp theo"
        >
          <ChevronRight className="h-6 w-6 md:h-8 md:w-8" aria-hidden="true" />
        </button>

        {/* Custom Pagination Dots */}
        <div className="hero-carousel-pagination absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center" />
      </Swiper>
    </section>
  );
}

