import React, { useState } from 'react';
import { Calendar as CalendarIcon, List } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ScheduleSection = ({ event, showtimes = [], onBuyTickets }) => {
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
    <section className="bg-surface/50 rounded-2xl glass-border p-6 md:p-8 space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-brand-600">Lịch diễn</h2>
        
        <div className="flex bg-background/50 p-1 rounded-lg glass-border">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md transition-all",
              viewMode === 'list' ? "bg-brand-600 text-onBrand shadow-sm" : "text-muted-foreground hover:text-text"
            )}
          >
            <List className="w-4 h-4" />
            <span className="text-sm font-medium">Danh sách</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md transition-all",
              viewMode === 'calendar' ? "bg-brand-600 text-onBrand shadow-sm" : "text-muted-foreground hover:text-text"
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Lịch</span>
          </button>
        </div>
      </div>

      <div>
        {viewMode === 'list' ? (
          <div className="space-y-3">
            {showtimes.length > 0 ? (
              showtimes.map((st, idx) => (
                <div 
                  key={st.id || idx}
                  className="flex items-center justify-between p-4 rounded-xl bg-background/30 glass-border hover:border-brand-600/30 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-brand-600/10 flex flex-col items-center justify-center text-brand-600">
                      <span className="text-xs font-bold uppercase">{format(parseISO(st.startTime), 'MMM', { locale: vi })}</span>
                      <span className="text-lg font-bold leading-none">{format(parseISO(st.startTime), 'dd')}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{format(parseISO(st.startTime), 'EEEE, dd/MM/yyyy', { locale: vi })}</p>
                      <p className="text-sm text-muted-foreground">{format(parseISO(st.startTime), 'HH:mm')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={onBuyTickets}
                    className="px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-sm font-bold hover:bg-brand-600 hover:text-onBrand transition-all opacity-0 group-hover:opacity-100"
                  >
                    Chọn
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>Chưa có lịch diễn nào được cập nhật.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="bg-background/30 rounded-2xl p-4 glass-border">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={vi}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                className="rdp-custom"
                classNames={{
                  day_selected: "bg-brand-600 text-onBrand rounded-lg",
                  day_today: "text-brand-600 font-bold",
                  head_cell: "text-muted-foreground font-medium text-sm",
                  nav_button: "hover:bg-brand-600/10 rounded-lg p-1 transition-colors",
                }}
              />
            </div>
            
            <div className="flex-1 space-y-4 w-full">
              <h3 className="font-bold text-lg">
                Suất diễn ngày {format(selectedDate, 'dd/MM/yyyy')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {showtimes.filter(st => isSameDay(parseISO(st.startTime), selectedDate)).length > 0 ? (
                  showtimes
                    .filter(st => isSameDay(parseISO(st.startTime), selectedDate))
                    .map((st, idx) => (
                      <button 
                        key={st.id || idx}
                        onClick={onBuyTickets}
                        className="p-3 rounded-xl bg-background/50 glass-border hover:border-brand-600 text-center transition-all hover:-translate-y-1"
                      >
                        <p className="font-bold text-brand-600">{format(parseISO(st.startTime), 'HH:mm')}</p>
                        <p className="text-xs text-muted-foreground mt-1">Còn vé</p>
                      </button>
                    ))
                ) : (
                  <p className="col-span-full text-muted-foreground py-8 italic">
                    Không có suất diễn nào trong ngày này.
                  </p>
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
