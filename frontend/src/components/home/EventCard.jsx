import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { formatDateTime, formatVND } from '@/utils/formatters';
import { resolveMediaUrl } from '@/utils/media';
import bannerFallback from '@/assets/banner-sample.svg';
import { Calendar } from 'lucide-react';
import { getCategoryLabel } from '@/constants/categories';

const EventCard = memo(({ event }) => {
  const imageUrl = resolveMediaUrl(event.banner_url) || bannerFallback;
  const isPast = new Date(event.start_time) < new Date();
  const categoryLabel = getCategoryLabel(event.category) || 'Sự kiện';
  const formattedPrice = formatVND(event.min_price || 0);
  const formattedStartTime = formatDateTime(event.start_time);
  const accessibleLabel = `${event.title}. ${categoryLabel}. Giá từ ${formattedPrice}. Thời gian bắt đầu ${formattedStartTime}.${isPast ? ' Sự kiện đã diễn ra.' : ''} Xem chi tiết sự kiện.`;

  return (
    <Link to={`/events/${event.slug || event.id}`} className="block group" aria-label={accessibleLabel}>
      <Card role="article" className="flex h-full flex-col overflow-hidden border-none bg-transparent shadow-none">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
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
        
        <div className="flex flex-col pt-4 space-y-2">
          <h3 className="line-clamp-2 font-sans font-bold text-lg leading-snug text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <span>Từ {formattedPrice}</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{formattedStartTime}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;
