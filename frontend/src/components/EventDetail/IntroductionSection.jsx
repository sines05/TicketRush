import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const IntroductionSection = ({ event }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!event) return null;

  const hasDetails = event.author || event.director || event.actors;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-[32px] border border-white/60 dark:border-white/10 p-7 md:p-10 space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-fade-in-up">
      <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
        <div className="h-2.5 w-2.5 rounded-full bg-brand-600" />
        Giới thiệu
      </h2>
      
      <div className="space-y-8">
        {hasDetails && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {event.author && (
              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-600">Tác giả</p>
                <p className="font-bold text-slate-900 dark:text-white">{event.author}</p>
              </div>
            )}
            {event.director && (
              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-600">Đạo diễn</p>
                <p className="font-bold text-slate-900 dark:text-white">{event.director}</p>
              </div>
            )}
            {event.actors && (
              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-600">Diễn viên</p>
                <p className="font-bold text-slate-900 dark:text-white">{event.actors}</p>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <div 
            className={cn(
              "text-slate-600 dark:text-slate-400 text-base leading-relaxed transition-all duration-500 overflow-hidden",
              !isExpanded && "max-h-60"
            )}
          >
            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: event.description }} />
            
            {!isExpanded && (
              <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
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
