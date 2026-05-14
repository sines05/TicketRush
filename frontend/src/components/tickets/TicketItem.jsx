import { QRCodeCanvas } from 'qrcode.react';
import { formatVND } from '../../utils/formatters.js';
import bannerFallback from '../../assets/banner-sample.svg';
import { resolveMediaUrl } from '../../utils/media.js';

export default function TicketItem({ ticket }) {
  if (!ticket) return null;

  const rowLabel = ticket.row_label || String(ticket.seat_label || '').split('-')[0] || '—';
  const seatNumber = (ticket.seat_number ?? String(ticket.seat_label || '').split('-')[1]) || '—';
  const gate = ticket.zone_name || '—';
  const bannerUrl = resolveMediaUrl(ticket.event_banner_url) || bannerFallback;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm"> 
      <div className="grid items-stretch md:grid-cols-[1.6fr_1fr]">
        <div className="relative h-52 overflow-hidden md:h-full md:min-h-52">
          <img
            src={bannerUrl}
            alt={ticket.event_title}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
          />
        </div>

        <div className="relative p-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden border-l-2 border-dashed border-border md:block" />
          <div className="pointer-events-none absolute -left-3 top-9 hidden h-6 w-6 rounded-full border bg-background md:block" />
          <div className="pointer-events-none absolute -left-3 bottom-9 hidden h-6 w-6 rounded-full border bg-background md:block" />

          <div className="space-y-3 md:pl-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-bold truncate">{ticket.event_title}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      ticket.is_checked_in 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}
                  >
                    {ticket.is_checked_in ? 'Đã check-in' : 'Chưa check-in'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground break-all">Mã vé: {ticket.ticket_id}</div>
                {ticket.price != null && <div className="mt-2 text-base font-semibold text-primary">{formatVND(ticket.price)}</div>}
              </div>
              <div className="shrink-0 rounded-lg border bg-white p-2">
                <QRCodeCanvas value={ticket.qr_code_token} size={96} includeMargin />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border bg-muted/50 p-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Gate</div>
                <div className="mt-1 text-sm font-semibold truncate">{gate}</div>
              </div>
              <div className="rounded-lg border bg-muted/50 p-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Row</div>
                <div className="mt-1 text-sm font-semibold">{rowLabel}</div>
              </div>
              <div className="rounded-lg border bg-muted/50 p-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Seat</div>
                <div className="mt-1 text-sm font-semibold">{seatNumber}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
