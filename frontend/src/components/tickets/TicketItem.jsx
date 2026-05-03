import { QRCodeCanvas } from 'qrcode.react';
import { formatVND } from '../../utils/formatters.js';
import bannerFallback from '../../assets/banner-sample.svg';

export default function TicketItem({ ticket }) {
  if (!ticket) return null;

  const rowLabel = ticket.row_label || String(ticket.seat_label || '').split('-')[0] || '—';
  const seatNumber = (ticket.seat_number ?? String(ticket.seat_label || '').split('-')[1]) || '—';
  const gate = ticket.zone_name || '—';
  const bannerUrl = ticket.event_banner_url || bannerFallback;

  return (
    <div className="overflow-hidden rounded-2xl border border-text/10 bg-surface"> 
      <div className="grid md:grid-cols-[1.6fr_1fr]">
        <div className="relative">
          <img src={bannerUrl} alt={ticket.event_title} className="h-52 w-full object-cover md:h-52" loading="lazy" />
        </div>

        <div className="relative p-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden border-l border-dashed border-text/20 md:block" />
          <div className="pointer-events-none absolute -left-3 top-9 hidden h-6 w-6 rounded-full border border-text/10 bg-bg md:block" />
          <div className="pointer-events-none absolute -left-3 bottom-9 hidden h-6 w-6 rounded-full border border-text/10 bg-bg md:block" />

          <div className="space-y-3 md:pl-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-bold truncate">{ticket.event_title}</div>
                <div className="mt-1 text-sm text-muted break-all">Mã vé: {ticket.ticket_id}</div>
                {ticket.price != null && <div className="mt-2 text-base font-semibold text-muted">{formatVND(ticket.price)}</div>}
              </div>
              <div className="shrink-0 rounded-lg bg-white p-2">
                <QRCodeCanvas value={ticket.qr_code_token} size={96} includeMargin />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-text/10 bg-bg/40 p-2">
                <div className="text-[10px] uppercase tracking-wide text-muted">Gate</div>
                <div className="mt-1 text-sm font-semibold truncate">{gate}</div>
              </div>
              <div className="rounded-lg border border-text/10 bg-bg/40 p-2">
                <div className="text-[10px] uppercase tracking-wide text-muted">Row</div>
                <div className="mt-1 text-sm font-semibold">{rowLabel}</div>
              </div>
              <div className="rounded-lg border border-text/10 bg-bg/40 p-2">
                <div className="text-[10px] uppercase tracking-wide text-muted">Seat</div>
                <div className="mt-1 text-sm font-semibold">{seatNumber}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
