import React, { useState } from 'react';
import { Calendar as CalendarIcon, List } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ScheduleSection = ({ event, showtimes = [], onBuyTickets, isPast }) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());

  if (!event) return null;

  const showtimeDates = showtimes.map(st => parseISO(st.startTime));

  const modifiers = {
    hasShowtime: showtimeDates,
  };

  const modifiersStyles = {
    hasShowtime: {
      fontWeight: 'bold',
      color: 'rgb(var(--tr-brand-600))',
      textDecoration: 'underline',
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-[32px] border border-white/60 dark:border-white/10 p-7 md:p-10 space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-brand-600" />
          Lịch diễn
        </h2>
        
        <div className="flex bg-slate-50 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-100 dark:border-white/10">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-widest",
              viewMode === 'list' ? "bg-white dark:bg-slate-800 text-brand-600 shadow-md" : "text-muted-foreground hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <List className="w-4 h-4" />
            <span>Danh sách</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-widest",
              viewMode === 'calendar' ? "bg-white dark:bg-slate-800 text-brand-600 shadow-md" : "text-muted-foreground hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Lịch</span>
          </button>
        </div>
      </div>

      <div className="mt-4">
        {viewMode === 'list' ? (
          <div className="grid gap-4">
            {showtimes.length > 0 ? (
              showtimes.map((st, idx) => (
                <div 
                  key={st.id || idx}
                  className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:border-brand-600/40 hover:bg-white dark:hover:bg-slate-800/50 transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-brand-600/10 flex flex-col items-center justify-center text-brand-600 border border-brand-600/20">
                      <span className="text-[10px] font-black uppercase tracking-tighter">{format(parseISO(st.startTime), 'MMM', { locale: vi })}</span>
                      <span className="text-xl font-black leading-none">{format(parseISO(st.startTime), 'dd')}</span>
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{format(parseISO(st.startTime), 'EEEE, dd/MM/yyyy', { locale: vi })}</p>
                      <p className="text-sm font-bold text-brand-600 flex items-center gap-1.5 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-pulse" />
                        {format(parseISO(st.startTime), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={onBuyTickets}
                    disabled={isPast}
                    className={cn(
                      "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                      isPast 
                        ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed" 
                        : "bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:scale-105 active:scale-95"
                    )}
                  >
                    {isPast ? 'Đã kết thúc' : 'Chọn suất'}
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[32px]">
                <CalendarIcon className="w-12 h-12 mb-4 opacity-10" />
                <p className="font-bold uppercase tracking-widest text-xs">Chưa có lịch diễn nào</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10 items-start">
            <div className="bg-slate-50 dark:bg-white/5 rounded-[32px] p-6 border border-slate-100 dark:border-white/5 shadow-inner">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={vi}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                className="rdp-custom"
                classNames={{
                  day_selected: "bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-600/30",
                  day_today: "text-brand-600 font-black",
                  head_cell: "text-slate-400 font-black text-[10px] uppercase tracking-widest pb-4",
                  nav_button: "hover:bg-brand-600/10 rounded-xl p-2 transition-all text-brand-600",
                }}
              />
            </div>
            
            <div className="flex-1 space-y-6 w-full">
              <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="h-1.5 w-6 rounded-full bg-brand-600/30" />
                Suất diễn {format(selectedDate, 'dd/MM/yyyy')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {showtimes.filter(st => isSameDay(parseISO(st.startTime), selectedDate)).length > 0 ? (
                  showtimes
                    .filter(st => isSameDay(parseISO(st.startTime), selectedDate))
                    .map((st, idx) => (
                      <button 
                        key={st.id || idx}
                        onClick={onBuyTickets}
                        disabled={isPast}
                        className={cn(
                          "p-4 rounded-[24px] border transition-all flex flex-col items-center justify-center gap-1 shadow-sm",
                          isPast 
                            ? "bg-slate-100 dark:bg-slate-800/50 border-transparent opacity-50 cursor-not-allowed" 
                            : "bg-white dark:bg-slate-800 border-slate-100 dark:border-white/10 hover:border-brand-600 hover:shadow-xl hover:-translate-y-1"
                        )}
                      >
                        <p className="font-black text-xl text-brand-600">{format(parseISO(st.startTime), 'HH:mm')}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{isPast ? 'Đã kết thúc' : 'Còn vé'}</p>
                      </button>
                    ))
                ) : (
                  <div className="col-span-full bg-slate-50 dark:bg-white/5 rounded-3xl p-10 border border-dashed border-slate-200 dark:border-white/10 text-center">
                    <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">
                      Không có suất diễn nào
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ScheduleSection;
