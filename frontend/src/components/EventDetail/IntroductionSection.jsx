import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const IntroductionSection = ({ event }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!event) return null;

  const hasDetails = event.author || event.director || event.actors;

  return (
    <section className="bg-surface/50 rounded-2xl glass-border p-6 md:p-8 space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-brand-600">Giới thiệu</h2>
      
      <div className="space-y-6">
        {hasDetails && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {event.author && (
              <div className="space-y-1">
                <p className="text-muted-foreground italic underline decoration-brand-600/30 underline-offset-4">Tác giả</p>
                <p className="font-medium">{event.author}</p>
              </div>
            )}
            {event.director && (
              <div className="space-y-1">
                <p className="text-muted-foreground italic underline decoration-brand-600/30 underline-offset-4">Đạo diễn</p>
                <p className="font-medium">{event.director}</p>
              </div>
            )}
            {event.actors && (
              <div className="space-y-1">
                <p className="text-muted-foreground italic underline decoration-brand-600/30 underline-offset-4">Diễn viên</p>
                <p className="font-medium">{event.actors}</p>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <div 
            className={cn(
              "text-muted-foreground leading-relaxed transition-all duration-500 overflow-hidden",
              !isExpanded && "max-h-40"
            )}
          >
            <div dangerouslySetInnerHTML={{ __html: event.description }} />
            
            {!isExpanded && (
              <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 flex items-center gap-1 text-brand-600 font-semibold hover:text-brand-700 transition-colors group"
          >
            <span>{isExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            ) : (
              <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

export default IntroductionSection;
