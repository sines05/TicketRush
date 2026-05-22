import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CITY_OPTIONS } from '@/constants/locations';
import otherImage from '@/assets/locations/other.webp';

export default function LocationCards() {
  const locations = [
    ...CITY_OPTIONS,
    {
      key: 'other',
      label: 'Vị trí khác',
      image: otherImage
    }
  ];

  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setVisibleCount(1);
      } else if (window.innerWidth < 1024) {
        setVisibleCount(2);
      } else {
        setVisibleCount(4);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, locations.length - visibleCount);

  // Ensure startIndex is valid if visibleCount changes
  useEffect(() => {
    if (startIndex > maxIndex) {
      setStartIndex(maxIndex);
    }
  }, [visibleCount, maxIndex, startIndex]);

  const nextSlide = () => {
    if (startIndex < maxIndex) {
      setStartIndex((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    if (startIndex > 0) {
      setStartIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="sc-f2beda43-1 cALFhf px-4 md:px-0">
      <div className="flex justify-between items-center mb-6">
        <div className="sc-f2beda43-0 jXGXcj mb-0">Điểm đến thú vị</div>
        <div className="flex items-center gap-3">
          <button
            onClick={prevSlide}
            disabled={startIndex === 0}
            className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 hover:scale-105 active:scale-95 ${
              startIndex === 0
                ? 'opacity-30 cursor-not-allowed border-border bg-transparent text-muted-foreground'
                : 'border-border bg-card text-foreground shadow-md hover:bg-accent hover:text-accent-foreground'
            }`}
            aria-label="Slide left"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextSlide}
            disabled={startIndex === maxIndex}
            className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 hover:scale-105 active:scale-95 ${
              startIndex === maxIndex
                ? 'opacity-30 cursor-not-allowed border-border bg-transparent text-muted-foreground'
                : 'border-border bg-card text-foreground shadow-md hover:bg-accent hover:text-accent-foreground'
            }`}
            aria-label="Slide right"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden mx-[-4px] px-[4px] py-2">
        <div
          className="sc-f2beda43-2 LLgWH"
          style={{
            transform: `translate3d(-${startIndex * (100 / locations.length)}%, 0px, 0px)`,
            width: `${(locations.length / visibleCount) * 100}%`
          }}
        >
          {locations.map((loc) => (
            <div
              key={loc.key}
              className="px-[4px] box-border"
              style={{ width: `${100 / locations.length}%` }}
            >
              <div>
                <Link
                  to={loc.key === 'other' ? '/search' : `/search?location=${loc.key}`}
                  className="sc-d5c279a8-0 fYbeZu"
                  aria-label={`Xem sự kiện tại ${loc.label}`}
                >
                  <div className="sc-d5c279a8-1 cTUklV text-white">
                    {loc.label}
                  </div>
                  <span style={{ boxSizing: 'border-box', display: 'block', overflow: 'hidden', width: 'initial', height: 'initial', background: 'none', opacity: 1, border: '0px', margin: '0px', padding: '0px', position: 'absolute', inset: '0px' }}>
                    <img
                      alt="event"
                      src={loc.image}
                      decoding="async"
                      data-nimg="fill"
                      style={{ width: '0px', height: '0px', position: 'absolute', inset: '0px', boxSizing: 'border-box', padding: '0px', borderWidth: 'medium', borderStyle: 'none', borderColor: 'currentColor', borderImage: 'initial', margin: 'auto', display: 'block', minWidth: '100%', maxWidth: '100%', minHeight: '100%', maxHeight: '100%', objectFit: 'cover' }}
                    />
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
