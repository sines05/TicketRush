import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { formatEventDate, formatVND } from '@/utils/formatters';
import { resolveMediaUrl } from '@/utils/media';
import bannerFallback from '@/assets/banner-sample.svg';
import { Calendar } from 'lucide-react';
import { getCategoryLabel } from '@/constants/categories';

const EventCard = memo(({ event }) => {
  const imageUrl = resolveMediaUrl(event.banner_url) || bannerFallback;
  const isPast = new Date(event.start_time) < new Date();
  const categoryLabel = getCategoryLabel(event.category) || 'Sự kiện';
  const formattedPrice = formatVND(event.min_price || 0);
  const formattedStartTime = formatEventDate(event.start_time);
  const accessibleLabel = `${event.title}. ${categoryLabel}. Giá từ ${formattedPrice}. Thời gian bắt đầu ${formattedStartTime}.${isPast ? ' Sự kiện đã diễn ra.' : ''} Xem chi tiết sự kiện.`;

  return (
    <div className="block group sc-cd3dcefe-0 YoyVJ tr-event-card relative" aria-label={accessibleLabel}>
      <Card role="article" className="flex h-full flex-col overflow-hidden border-none bg-transparent shadow-none">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl sc-cd3dcefe-1 eJVcKb">
          <img
            src={imageUrl}
            alt={`Ảnh banner sự kiện ${event.title}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          {isPast && (
            <div className="absolute right-2 top-2 z-10 rounded-md bg-orange-500 px-2 py-1 text-[10px] font-bold uppercase text-white shadow-lg">
              Đã diễn ra
            </div>
          )}
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-white/90 backdrop-blur-md text-black text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
              {categoryLabel}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <div className="flex flex-1 flex-col pt-3">
          <div className="min-h-[2.8rem] mb-2">
            <h3 className="line-clamp-2 font-sans font-bold text-base leading-snug text-foreground tracking-tight group-hover:text-primary transition-colors">
              {event.title}
            </h3>
          </div>
          
          <div className="mt-auto flex flex-col space-y-1">
            <div className="flex items-center gap-2 text-[13px] font-black text-brand-600">
              <span>Từ {formattedPrice}</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-tight">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              <span>{formattedStartTime}</span>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Absolute overlay link to make the entire card clickable, and satisfy Playwright */}
      <Link 
        to={`/events/${event.slug || event.id}`} 
        className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/10 transition-opacity rounded-xl"
      >
        <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition-transform duration-300 transform translate-y-2 group-hover:translate-y-0">
          Xem chi tiết
        </span>
      </Link>
    </div>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;
