import React from 'react';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const EventCard = ({ data }) => {
  const { name, date, location, slug, image_url } = data;

  return (
    <Card className="overflow-hidden border-none shadow-md bg-background/50 backdrop-blur-sm my-2">
      {image_url && (
        <div className="h-32 w-full overflow-hidden">
          <img 
            src={image_url} 
            alt={name} 
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
          />
        </div>
      )}
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-sm font-bold line-clamp-1">{name}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-2 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{location}</span>
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-8 text-xs gap-1.5"
          onClick={() => window.open(`/events/${slug}`, '_blank')}
        >
          <ExternalLink className="h-3 w-3" />
          Xem chi tiết
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EventCard;
