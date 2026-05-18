import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import HeroCarousel from '@/components/home/HeroCarousel';
import SpecialEvents from '@/components/home/SpecialEvents';
import TrendingEvents from '@/components/home/TrendingEvents';
import LocationCards from '@/components/home/LocationCards';
import SystemReportCarousel from '@/components/home/SystemReportCarousel';
import EventReviewCarousel from '@/components/home/EventReviewCarousel';
import EventListWithTabs from '@/components/home/EventListWithTabs';
import PromotionBanners from '@/components/home/PromotionBanners';
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
    <>
      <Helmet>
        <title>TicketRush | Khám phá sự kiện giải trí hàng đầu</title>
        <meta name="description" content="Săn vé sự kiện, concert, thể thao và kịch nói nhanh chóng, an toàn tại TicketRush." />
      </Helmet>

      <a
        href="#home-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-foreground focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Bỏ qua phần điều hướng và đến nội dung chính
      </a>

      <main id="home-main-content" className="space-y-20 pb-20" aria-label="Trang chủ TicketRush">

      {/* 0. Hero Carousel */}
      {!loading && heroEvents.length > 0 && (
        <HeroCarousel events={heroEvents} />
      )}

      <PromotionBanners />

      {/* 1. Special Events - High Impact vertical cards */}
      <SpecialEvents />

      {/* 2. Trending Events - teal ranks and fire icon */}
      <TrendingEvents />

      {/* 3. Location Cards - Points of Interest */}
      <LocationCards />

      {/* 4. Featured system reports from complaints */}
      <SystemReportCarousel />

      {/* 4.5. Event reviews carousel */}
      <EventReviewCarousel />

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
        <span aria-hidden="true">•</span>
        <span>TicketRush Premium Experience</span>
      </div>
      </main>
    </>
  );
}
