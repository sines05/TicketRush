import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import HeroCarousel from '@/components/home/HeroCarousel';
import SpecialEvents from '@/components/home/SpecialEvents';
import TrendingEvents from '@/components/home/TrendingEvents';
import LocationCards from '@/components/home/LocationCards';
import SystemReportCarousel from '@/components/home/SystemReportCarousel';
import EventListWithTabs from '@/components/home/EventListWithTabs';
import { CATEGORY_OPTIONS } from '@/constants/categories';
import eventService from '@/services/eventService';

export default function Home() {
  const location = useLocation();
  const [heroEvents, setHeroEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHero() {
      setLoading(true);
      try {
        const data = await eventService.getHeroEvents(5);
        setHeroEvents(data);
      } catch {
        setHeroEvents([]);
      } finally {
        setLoading(false);
      }
    }
    fetchHero();
  }, [location.key]);

  return (
    <div className="space-y-20 pb-20">
      <Helmet>
        <title>TicketRush | Khám phá sự kiện giải trí hàng đầu</title>
        <meta name="description" content="Săn vé sự kiện, concert, thể thao và kịch nói nhanh chóng, an toàn tại TicketRush." />
      </Helmet>

      {/* 0. Hero Carousel */}
      {!loading && heroEvents.length > 0 && (
        <HeroCarousel events={heroEvents} />
      )}

      {/* 1. Special Events - High Impact vertical cards */}
      <SpecialEvents />

      {/* 2. Trending Events - teal ranks and fire icon */}
      <TrendingEvents />

      {/* 3. Location Cards - Points of Interest */}
      <LocationCards />

      {/* 4. Featured system reports from complaints */}
      <SystemReportCarousel />

      {/* 5. Categorized Lists - with Weekend/Month tabs */}
      <div className="space-y-20">
        {CATEGORY_OPTIONS.map((cat) => (
          <EventListWithTabs 
            key={cat.key} 
            categoryKey={cat.key} 
            title={cat.label} 
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-10">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-medium">
          Live API
        </span>
        <span>•</span>
        <span>TicketRush Premium Experience</span>
      </div>
    </div>
  );
}
