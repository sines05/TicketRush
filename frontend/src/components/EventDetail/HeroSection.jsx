import React from 'react';
import { MapPin, Calendar, Clock, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const HeroSection = React.forwardRef(({ event, minPrice, onBuyTickets }, ref) => {
  if (!event) return null;

  const formattedDate = event.startTime 
    ? format(new Date(event.startTime), 'EEEE, dd/MM/yyyy', { locale: vi })
    : 'Đang cập nhật';

  const formattedTime = event.startTime
    ? format(new Date(event.startTime), 'HH:mm')
    : 'Đang cập nhật';

  return (
    <section 
      ref={ref}
      className="relative bg-surface text-text py-12 md:py-20 overflow-hidden"
    >
      {/* Ambient background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid items-stretch gap-8 md:grid-cols-[1.6fr_1fr] md:gap-16">
          {/* Left Column: Info */}
          <div className="space-y-6 animate-fade-in-up">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-tight">
                {event.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-600" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-600" />
                  <span>{formattedTime}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-brand-600 mt-1 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-lg">{event.locationName || 'Đang cập nhật'}</p>
                  <p className="text-muted-foreground">{event.locationAddress}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-brand-600 shrink-0" />
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Giá từ:</span>
                  <span className="text-2xl font-bold text-brand-600">
                    {minPrice ? `${minPrice.toLocaleString('vi-VN')} VNĐ` : 'Đang cập nhật'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onBuyTickets}
              className="w-full md:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-onBrand font-bold rounded-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-600/20 active:scale-95"
            >
              Mua vé ngay
            </button>
          </div>

          {/* Right Column: Poster */}
          <div className="w-full animate-scale-in">
            <div className="relative h-64 overflow-hidden rounded-2xl border border-white/10 shadow-2xl group md:h-full md:min-h-[19rem]">
              <img
                src={event.posterUrl || '/placeholder-poster.jpg'}
                alt={event.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;
