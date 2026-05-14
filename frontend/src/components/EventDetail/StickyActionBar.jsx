import React from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVND } from '../../utils/formatters.js';

const StickyActionBar = ({ event, isVisible, onBuyTickets, minPrice }) => {
  if (!event) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-md border-t border-white/10 z-50 transition-all duration-500 transform",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 hidden sm:block">
          <h3 className="font-bold text-white truncate">{event.title}</h3>
          <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{event.locationName}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="hidden lg:block text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Giá vé từ</p>
            <p className="text-brand-600 font-bold">
              {minPrice ? formatVND(minPrice) : 'Đang cập nhật'}
            </p>
          </div>
          
          <button
            onClick={onBuyTickets}
            className="flex-1 sm:flex-none px-8 py-3 bg-brand-600 hover:bg-brand-700 text-onBrand font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-brand-600/20"
          >
            Mua vé ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default StickyActionBar;
