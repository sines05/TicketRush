import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Search, Zap, TrendingUp, ArrowUpRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import eventService from '@/services/eventService';
import { resolveMediaUrl } from '@/utils/media';
import { cn } from '@/lib/utils';
import { CATEGORY_OPTIONS, getCategoryLabel } from '@/constants/categories';
import { CITY_OPTIONS } from '@/constants/locations';

// Category Images
import musicImg from '@/assets/categories/music.jpg';
import sportsImg from '@/assets/categories/sports.jpg';
import artsImg from '@/assets/categories/arts.jpg';
import educationImg from '@/assets/categories/education.jpg';
import entertainmentImg from '@/assets/categories/entertainment.jpg';
import communityImg from '@/assets/categories/community.jpg';

// Other City Images
import other1 from '@/assets/misc/other_1.jpg';
import other2 from '@/assets/misc/other_2.jpg';
import other3 from '@/assets/misc/other_3.jpg';
import other4 from '@/assets/misc/other_4.jpg';

const RECENT_SEARCHES_KEY = 'tr_recent_searches';

const CATEGORY_IMAGES = {
  music_festival: musicImg,
  sports: sportsImg,
  arts_stage: artsImg,
  education_workshop: educationImg,
  experience_entertainment: entertainmentImg,
  community_other: communityImg
};

const OTHER_CITY_IMAGES = [other1, other2, other3, other4];

export default function SearchOverlay({ isOpen, onClose }) {
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
    return [];
  });
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('category'); // 'category' | 'city'

  // Sync recent searches to localStorage
  useEffect(() => {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Load initial data
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await eventService.getTrendingEvents(10);
        setTrendingEvents(data);
      } catch (e) {
        console.error('Failed to fetch trending events', e);
      }
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
    }
  }, [isOpen]);

  const saveRecentSearch = useCallback((keyword) => {
    if (!keyword.trim()) return;
    
    setRecentSearches(prev => {
      const updated = [
        keyword,
        ...prev.filter(s => s !== keyword)
      ].slice(0, 5); // Keep last 5 searches
      return updated;
    });
  }, []);

  const handleSearchAction = useCallback((params) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    navigate(`/search?${newParams.toString()}`);
    onClose();
  }, [navigate, onClose, searchParams]);

  const handleRecentClick = useCallback((keyword) => {
    saveRecentSearch(keyword);
    handleSearchAction({ q: keyword });
  }, [handleSearchAction, saveRecentSearch]);

  const handleCategoryClick = useCallback((categoryKey) => {
    handleSearchAction({ category: categoryKey });
  }, [handleSearchAction]);

  const handleEventClick = useCallback((event) => {
    navigate(`/events/${event.slug || event.id}`);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && query.trim()) {
        saveRecentSearch(query);
        handleSearchAction({ q: query });
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, query, handleSearchAction, saveRecentSearch]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-x-0 bottom-0 top-[80px] z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="relative mx-auto w-full md:max-w-[65%] h-full md:h-[75dvh] bg-[#0c1a1a] md:rounded-b-3xl flex flex-col shadow-2xl animate-in slide-in-from-top-4 duration-500 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-all z-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Top 20% - Search, History, Trends */}
        <div className="shrink-0 p-6 md:p-10 flex flex-col justify-center border-b border-white/5 bg-white/[0.02]">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm sự kiện, nghệ sĩ, địa điểm..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-32 text-white text-lg font-medium outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-white/20"
            />
            <button 
              onClick={() => query.trim() && handleRecentClick(query)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-black font-bold px-6 py-2 rounded-xl hover:bg-primary/90 transition-colors"
            >
              Tìm kiếm
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {recentSearches.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Gần đây:</span>
                <div className="flex gap-3">
                  {recentSearches.slice(0, 3).map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleRecentClick(s)}
                      className="flex items-center gap-1 text-white/60 hover:text-primary text-xs transition-colors"
                    >
                      <TrendingUp className="h-3 w-3 opacity-50" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                Xu hướng:
              </span>
              <div className="flex gap-3">
                {trendingEvents.slice(0, 3).map((e, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleEventClick(e)}
                    className="text-white/60 hover:text-primary text-xs transition-colors"
                  >
                    {e.title.split(':')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 80% - Tabs & Suggestions */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-12">
          {/* Tabs Section */}
          <div className="space-y-8">
            <div className="flex items-center gap-8 border-b border-white/5">
              <button 
                onClick={() => setActiveTab('category')}
                className={cn(
                  "pb-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative",
                  activeTab === 'category' ? "text-primary" : "text-white/30 hover:text-white/50"
                )}
              >
                Theo Thể loại
                {activeTab === 'category' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
              <button 
                onClick={() => setActiveTab('city')}
                className={cn(
                  "pb-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative",
                  activeTab === 'city' ? "text-primary" : "text-white/30 hover:text-white/50"
                )}
              >
                Theo Thành phố
                {activeTab === 'city' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeTab === 'category' ? (
                CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => handleCategoryClick(cat.key)}
                    className="relative h-24 rounded-xl overflow-hidden group"
                  >
                    <img 
                      src={CATEGORY_IMAGES[cat.key] || communityImg} 
                      alt={cat.label}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <span className="text-white font-bold text-sm text-center">{cat.label}</span>
                    </div>
                  </button>
                ))
              ) : (
                <>
                  {CITY_OPTIONS.map((city) => (
                    <button
                      key={city.key}
                      onClick={() => handleSearchAction({ location: city.key })}
                      className="relative h-32 rounded-2xl overflow-hidden group shadow-lg"
                    >
                      <img 
                        src={city.image} 
                        alt={city.label}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-transparent" />
                      <div className="absolute top-4 left-4">
                        <span className="text-white font-bold text-base">{city.label}</span>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => handleSearchAction({ location: 'other' })}
                    className="relative h-32 rounded-2xl overflow-hidden group shadow-lg bg-white/5"
                  >
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5">
                      {OTHER_CITY_IMAGES.map((img, i) => (
                        <img key={i} src={img} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" alt="" />
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="text-white font-bold text-base">Vị trí khác</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Suggestions Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Gợi ý sự kiện nổi bật</h3>
              <div className="h-px flex-1 bg-white/5 ml-6" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trendingEvents.slice(0, 6).map((event) => (
                <div 
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all cursor-pointer"
                >
                  <div className="relative h-16 w-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img 
                      src={resolveMediaUrl(event.banner_url)} 
                      alt={event.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-all duration-700"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-sm truncate group-hover:text-primary transition-colors">{event.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40">
                       <span className="text-primary/80 font-bold uppercase">{getCategoryLabel(event.category)}</span>
                       <span className="w-1 h-1 rounded-full bg-white/10" />
                       <span>{event.location}</span>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-white/10 group-hover:text-primary transition-all mr-2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
