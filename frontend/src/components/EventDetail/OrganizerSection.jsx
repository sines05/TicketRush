import React from 'react';
import { Building2, Globe, Mail, Phone } from 'lucide-react';

const OrganizerSection = ({ event }) => {
  if (!event) return null;

  const organizer = event.organizer;

  if (!organizer) {
    return (
      <section className="bg-surface/50 rounded-2xl glass-border p-6 md:p-8 space-y-6 animate-fade-in-up">
        <h2 className="text-2xl font-bold text-brand-600">Ban tổ chức</h2>
        <p className="text-sm text-muted-foreground italic">Chưa có thông tin ban tổ chức</p>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-900 rounded-[32px] border border-white/60 dark:border-white/10 p-7 md:p-8 space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-fade-in-up">
      <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
        <div className="h-2.5 w-2.5 rounded-full bg-brand-600" />
        Ban tổ chức
      </h2>
      
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-28 h-28 rounded-[24px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
          {organizer.logo ? (
            <img src={organizer.logo} alt={organizer.name} className="w-full h-full object-contain p-2" />
          ) : (
            <Building2 className="w-12 h-12 text-brand-600/30" />
          )}
        </div>

        <div className="flex-1 space-y-5">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{organizer.name}</h3>
            <div className="h-1 w-10 bg-brand-600/30 rounded-full mt-3" />
            <p className="text-slate-600 dark:text-slate-400 mt-4 leading-relaxed text-sm font-medium">
              {organizer.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {organizer.website && (
              <a 
                href={organizer.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:border-brand-600/30 transition-all text-xs font-bold uppercase tracking-wider"
              >
                <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                  <Globe className="w-4 h-4" />
                </div>
                <span>Website</span>
              </a>
            )}
            {organizer.email && (
              <a 
                href={`mailto:${organizer.email}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:border-brand-600/30 transition-all text-xs font-bold uppercase tracking-wider"
              >
                <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                  <Mail className="w-4 h-4" />
                </div>
                <span>Liên hệ Email</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrganizerSection;
