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

  const posterUrl = event.posterUrl || '/placeholder-poster.jpg';

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-10 text-foreground md:py-16"
    >
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={posterUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-3xl saturate-150 dark:opacity-34"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--tr-background)/0.96)_0%,hsl(var(--tr-background)/0.82)_42%,hsl(var(--tr-background)/0.58)_100%)] dark:bg-[linear-gradient(90deg,hsl(var(--tr-background)/0.94)_0%,hsl(var(--tr-background)/0.76)_48%,hsl(var(--tr-background)/0.48)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_28%,hsl(var(--tr-accent)/0.28),transparent_34%),radial-gradient(circle_at_20%_10%,hsl(var(--tr-primary)/0.18),transparent_36%)] dark:bg-[radial-gradient(circle_at_76%_28%,hsl(var(--tr-accent)/0.18),transparent_34%),radial-gradient(circle_at_20%_10%,hsl(var(--tr-primary)/0.14),transparent_36%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="relative grid items-stretch gap-8 overflow-hidden rounded-[2rem] border border-white/45 bg-white/36 p-5 shadow-[0_32px_90px_-54px_hsl(var(--tr-primary)/0.65)] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_32px_90px_-58px_hsl(var(--tr-accent)/0.34)] md:grid-cols-[1.55fr_1fr] md:gap-14 md:p-8 lg:p-10">
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,hsl(var(--tr-card)/0.46),transparent_58%)] dark:bg-[linear-gradient(135deg,hsl(var(--tr-card)/0.18),transparent_58%)]" />

          <div className="relative z-10 space-y-6 animate-fade-in-up">
            <div className="space-y-3">
              <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-tight text-balance text-foreground drop-shadow-[0_1px_0_hsl(var(--tr-background)/0.65)] md:text-5xl lg:text-6xl">
                {event.title}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5 rounded-full border border-white/50 bg-white/55 px-3 py-1.5 backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:text-white/78">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-white/50 bg-white/55 px-3 py-1.5 backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:text-white/78">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{formattedTime}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{event.locationName || 'Đang cập nhật'}</p>
                  <p className="max-w-xl text-muted-foreground dark:text-white/70">{event.locationAddress}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 shrink-0 text-primary" />
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Giá từ:</span>
                  <span className="text-2xl font-black text-primary">
                    {minPrice ? `${minPrice.toLocaleString('vi-VN')} VNĐ` : 'Đang cập nhật'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onBuyTickets}
              className="w-full rounded-xl bg-primary px-8 py-4 font-bold text-primary-foreground shadow-[0_18px_44px_-24px_hsl(var(--tr-primary)/0.8)] transition-all duration-300 hover:-translate-y-1 hover:bg-primary/92 hover:shadow-[0_22px_56px_-24px_hsl(var(--tr-primary)/0.9)] active:scale-95 md:w-auto"
            >
              Mua vé ngay
            </button>
          </div>

          <div className="relative z-10 w-full animate-scale-in">
            <div className="group relative h-64 overflow-hidden rounded-3xl border border-white/50 shadow-[0_28px_70px_-36px_hsl(var(--tr-foreground)/0.7)] dark:border-white/15 md:h-full md:min-h-[19rem]">
              <img
                src={posterUrl}
                alt={event.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/8 opacity-80 transition-opacity duration-300 group-hover:opacity-55" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;
