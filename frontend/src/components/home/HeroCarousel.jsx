import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
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
  if (!events || events.length === 0) return null;

  return (
    <section className="group relative w-full px-4 py-6 md:px-8">
      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        spaceBetween={16}
        slidesPerView={1}
        loop={events.length > 2}
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
        navigation={{
          nextEl: '.hero-carousel-next',
          prevEl: '.hero-carousel-prev',
        }}
        breakpoints={{
          1024: {
            slidesPerView: 2,
          },
        }}
        className="relative h-[250px] sm:h-[350px] md:h-[400px] lg:h-[450px]"
      >
        {events.map((event) => (
          <SwiperSlide key={event.id}>
            <div className="relative h-full w-full overflow-hidden rounded-[2rem] shadow-lg">
              <img
                src={resolveMediaUrl(event.banner_url) || bannerFallback}
                alt={event.title}
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
                >
                  Xem chi tiết
                </Link>
              </div>

              {/* Bottom-right: Decorative Play icon */}
              <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8">
                <PlayCircle className="h-10 w-10 text-white/80 md:h-12 md:w-12" />
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
          type="button"
          className="hero-carousel-prev absolute left-2 top-1/2 z-10 flex h-12 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-card/80 text-foreground opacity-0 transition-all duration-300 hover:bg-card group-hover:opacity-100 md:left-4 md:h-16 md:w-10"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
        </button>

        <button
          type="button"
          className="hero-carousel-next absolute right-2 top-1/2 z-10 flex h-12 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-card/80 text-foreground opacity-0 transition-all duration-300 hover:bg-card group-hover:opacity-100 md:right-4 md:h-16 md:w-10"
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
        </button>

        {/* Custom Pagination Dots */}
        <div className="hero-carousel-pagination absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center" />
      </Swiper>
    </section>
  );
}
