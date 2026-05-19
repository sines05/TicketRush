import { QRCodeCanvas } from 'qrcode.react';
import { CalendarDays, CheckCircle2, Clock3, MapPin, Ticket as TicketIcon } from 'lucide-react';
import { formatVND, formatDateTime } from '../../utils/formatters.js';
import bannerFallback from '../../assets/banner-sample.svg';
import { resolveMediaUrl } from '../../utils/media.js';

export default function TicketItem({ ticket }) {
  if (!ticket) return null;

  const seatParts = String(ticket.seat_label || '').split('-');
  const rowLabel = ticket.row_label || seatParts[0] || '—';
  const seatNumber = (ticket.seat_number ?? seatParts[1]) || '—';
  const gate = ticket.zone_name || '—';
  const bannerUrl = resolveMediaUrl(ticket.event_banner_url) || bannerFallback;
  const eventEndTime = ticket.event_end_time ? new Date(ticket.event_end_time) : null;
  const isPast = eventEndTime ? eventEndTime < new Date() : false;
  const StatusIcon = ticket.is_checked_in ? CheckCircle2 : Clock3;
  const statusLabel = ticket.is_checked_in ? 'Đã check-in' : 'Chưa check-in';

  return (
    <article className="ticket-cutout group relative isolate overflow-hidden rounded-[1.75rem] bg-[#120c1d] text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(245,158,11,0.2),transparent_24%)] opacity-80" />

      <div className="relative grid items-stretch lg:grid-cols-[1.15fr_1px_1fr]">
        <div className="relative min-h-64 overflow-hidden">
          <img
            src={bannerUrl}
            alt={ticket.event_title}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120c1d] via-[#120c1d]/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-teal-200 backdrop-blur-md">
              <TicketIcon className="h-3.5 w-3.5" aria-hidden="true" />
              TicketRush Pass
            </div>
            <h3 className="line-clamp-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
              {ticket.event_title}
            </h3>
          </div>
        </div>

        <div className="relative hidden bg-[linear-gradient(to_bottom,transparent_0_8px,rgba(255,255,255,0.3)_8px_18px,transparent_18px_26px)] bg-[length:1px_26px] lg:block" />

        <div className="relative space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
                    ticket.is_checked_in
                      ? 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/25'
                      : 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/25'
                  }`}
                >
                  <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {statusLabel}
                </span>
                {isPast && (
                  <span className="rounded-full bg-rose-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-rose-200 ring-1 ring-rose-300/25">
                    Đã kết thúc
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-teal-200">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  <span>{formatDateTime(ticket.event_start_time)}</span>
                </div>
                <div className="flex items-start gap-2 text-xs font-medium text-white/62">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="break-all">Mã vé: {ticket.ticket_id}</span>
                </div>
                {ticket.price != null && (
                  <div className="pt-1 text-2xl font-black tracking-tight text-emerald-200">
                    {formatVND(ticket.price)}
                  </div>
                )}
              </div>
            </div>

            <div className="mx-auto shrink-0 rounded-[1.35rem] bg-white p-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:mx-0">
              <QRCodeCanvas value={ticket.qr_code_token} size={106} includeMargin />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center shadow-inner shadow-white/5">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Gate</div>
              <div className="mt-1 truncate text-sm font-black text-white sm:text-base">{gate}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center shadow-inner shadow-white/5">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Row</div>
              <div className="mt-1 text-sm font-black text-white sm:text-base">{rowLabel}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center shadow-inner shadow-white/5">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Seat</div>
              <div className="mt-1 text-sm font-black text-white sm:text-base">{seatNumber}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-semibold text-white/55">
            <span className="uppercase tracking-[0.18em]">Admit One</span>
            <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
            <span className="uppercase tracking-[0.18em]">QR Check-in</span>
          </div>
        </div>
      </div>
    </article>
  );
}
