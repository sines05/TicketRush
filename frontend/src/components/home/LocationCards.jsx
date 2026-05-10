import React from 'react';
import { Link } from 'react-router-dom';
import { CITY_OPTIONS } from '@/constants/locations';

// Other City Thumbs from misc assets (assuming they exist from previous turns)
import other1 from '@/assets/misc/other_1.jpg';
import other2 from '@/assets/misc/other_2.jpg';
import other3 from '@/assets/misc/other_3.jpg';
import other4 from '@/assets/misc/other_4.jpg';

const OTHER_THUMBS = [other1, other2, other3, other4];

export default function LocationCards() {
  // Only show first 3 major cities + "Other" to fit 4 columns
  const mainCities = CITY_OPTIONS.slice(0, 3);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase">Điểm đến thú vị</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainCities.map((loc) => (
          <Link
            key={loc.key}
            to={`/search?location=${loc.key}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
          >
            <img
              src={loc.image}
              alt={loc.label}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            {/* Green Gradient Overlay - Stronger at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent opacity-80" />
            
            <div className="absolute bottom-4 left-4">
              <span className="text-2xl font-black text-primary-foreground uppercase tracking-tight drop-shadow-md">
                {loc.label}
              </span>
            </div>
          </Link>
        ))}

        {/* Other Locations Collage Card */}
        <Link
          to="/search?location=other"
          className="group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
        >
          <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5 bg-white/10">
            {OTHER_THUMBS.map((url, i) => (
              <img
                key={i}
                src={url}
                alt="Other location"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ))}
          </div>
          
          {/* Green Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent opacity-80" />
          
          <div className="absolute bottom-4 left-4">
            <span className="text-2xl font-black text-primary-foreground uppercase tracking-tight drop-shadow-md">
              Vị trí khác
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
