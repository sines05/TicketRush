import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/utils/formatters';
import { resolveMediaUrl } from '@/utils/media';
import bannerFallback from '@/assets/banner-sample.svg';
import { Calendar } from 'lucide-react';

const EventCard = ({ event }) => {
  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl glass-surface glass-border border-none">
      <div className="relative aspect-video overflow-hidden">
        <img
          src={resolveMediaUrl(event.banner_url) || bannerFallback}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </div>
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="line-clamp-1 text-xl font-bold tracking-tight text-foreground">
              {event.title}
            </h3>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Calendar className="h-4 w-4" />
              <span>{formatDateTime(event.start_time)}</span>
            </div>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground/90 leading-relaxed">
            {event.description}
          </p>
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0">
        <Button asChild className="w-full font-bold shadow-lg shadow-primary/20" size="lg">
          <Link to={`/events/${event.slug || event.id}`}>Xem chi tiết</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EventCard;
