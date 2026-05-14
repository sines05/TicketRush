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
    <section className="bg-surface/50 rounded-2xl glass-border p-6 md:p-8 space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-brand-600">Ban tổ chức</h2>
      
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-24 h-24 rounded-2xl bg-background/50 glass-border flex items-center justify-center shrink-0 overflow-hidden">
          {organizer.logo ? (
            <img src={organizer.logo} alt={organizer.name} className="w-full h-full object-contain" />
          ) : (
            <Building2 className="w-10 h-10 text-brand-600/40" />
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-xl font-bold">{organizer.name}</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              {organizer.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {organizer.website && (
              <a 
                href={organizer.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-brand-600 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span>{organizer.website.replace('https://', '')}</span>
              </a>
            )}
            {organizer.email && (
              <a 
                href={`mailto:${organizer.email}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-brand-600 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>{organizer.email}</span>
              </a>
            )}
            {organizer.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{organizer.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrganizerSection;
