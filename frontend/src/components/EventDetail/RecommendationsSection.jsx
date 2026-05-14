import React from 'react';
import EventCard from '@/components/home/EventCard';

const MOCK_EVENTS = [
  {
    id: 'mock-1',
    title: 'Đại nhạc hội Summer Wave 2026',
    banner_url: null,
    start_time: new Date(Date.now() + 86400000 * 7).toISOString(),
    category: 'music_festival',
    min_price: 500000,
    slug: 'summer-wave-2026'
  },
  {
    id: 'mock-2',
    title: 'Kịch nói: Đêm Trắng',
    banner_url: null,
    start_time: new Date(Date.now() + 86400000 * 10).toISOString(),
    category: 'arts_stage',
    min_price: 200000,
    slug: 'dem-trang'
  },
  {
    id: 'mock-3',
    title: 'Giải chạy Marathon Thành phố',
    banner_url: null,
    start_time: new Date(Date.now() + 86400000 * 14).toISOString(),
    category: 'sports',
    min_price: 0,
    slug: 'marathon-thanh-pho'
  },
  {
    id: 'mock-4',
    title: 'Workshop: Làm gốm thủ công',
    banner_url: null,
    start_time: new Date(Date.now() + 86400000 * 5).toISOString(),
    category: 'education_workshop',
    min_price: 350000,
    slug: 'workshop-lam-gom'
  }
];

const RecommendationsSection = ({ events = [] }) => {
  const displayEvents = events && events.length > 0 ? events : MOCK_EVENTS;

  return (
    <section className="dark bg-[#0a0a0a] py-16 md:py-24">
      <div className="container mx-auto px-4 space-y-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white">
          Có thể bạn cũng thích
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {displayEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecommendationsSection;
