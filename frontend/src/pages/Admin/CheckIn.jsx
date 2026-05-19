import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Gauge,
  LayoutDashboard,
  Loader2,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Tickets,
  Wand2
} from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import Loading from '../../components/common/Loading.jsx';
import eventService from '../../services/eventService.js';
import ticketService from '../../services/ticketService.js';
import TicketItem from '../../components/tickets/TicketItem.jsx';

export default function AdminCheckIn() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [tickets, setTickets] = useState([]);
  const [qrToken, setQrToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [lastCheckedTicket, setLastCheckedTicket] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      try {
        const data = await eventService.getAdminEvents();
        if (!mounted) return;
        setEvents(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setSelectedEventId(data[0].id);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Không tải được danh sách sự kiện');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEvents();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setTickets([]);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError('');

    ticketService
      .getAdminTickets(selectedEventId)
      .then((data) => {
        if (!mounted) return;
        setTickets(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Không tải được danh sách vé');
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedEventId]);

  const currentEvent = useMemo(() => events.find((item) => item.id === selectedEventId), [events, selectedEventId]);

  const checkedInCount = useMemo(() => tickets.filter((ticket) => ticket.is_checked_in).length, [tickets]);
  const pendingCount = Math.max(tickets.length - checkedInCount, 0);
  const checkInRate = tickets.length ? Math.round((checkedInCount / tickets.length) * 100) : 0;

  async function handleScan(event) {
    event.preventDefault();
    setScanMessage('');
    setScanError('');
    setError('');
    setLastCheckedTicket(null);

    if (!qrToken.trim()) {
      setScanError('Nhập mã QR hoặc token vé để xác nhận khách.');
      return;
    }

    setScanLoading(true);
    try {
      const checkedTicket = await ticketService.checkInTicket(qrToken.trim());
      setScanMessage('Vé đã được xác nhận thành công.');
      setLastCheckedTicket(checkedTicket || null);
      setQrToken('');
      const data = await ticketService.getAdminTickets(selectedEventId);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setScanError(err?.message || 'Quét vé thất bại');
    } finally {
      setScanLoading(false);
    }
  }

  if (loading) {
    return <Loading title="Đang tải dữ liệu check-in..." />;
  }

  return (
    <div className="relative left-1/2 isolate -my-6 w-screen -translate-x-1/2 overflow-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(20,184,166,0.22),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(245,158,11,0.22),transparent_30%),linear-gradient(180deg,#f8fafc,#ecfeff_48%,#fff7ed)] px-4 py-6 text-slate-950 dark:bg-[radial-gradient(circle_at_10%_0%,rgba(45,212,191,0.16),transparent_30%),radial-gradient(circle_at_92%_10%,rgba(251,191,36,0.14),transparent_32%),linear-gradient(180deg,#080415,#111827_52%,#180d16)] dark:text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:34px_34px] opacity-60 dark:bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)]" />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-teal-600/20 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,118,110,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.075] dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
          <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-amber-300/28 blur-3xl dark:bg-amber-300/12" aria-hidden="true" />
          <div className="absolute -bottom-20 left-1/3 h-44 w-60 rounded-full bg-teal-300/24 blur-3xl dark:bg-cyan-300/10" aria-hidden="true" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-100/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-teal-800 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Cổng soát vé
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Admin Check-in
              </h1>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                Chọn đúng sự kiện, nhập QR token hoặc mã vé để xác nhận khách vào cổng. Vé đã check-in sẽ được khóa trạng thái ngay sau khi xác nhận.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 !bg-slate-950 px-4 py-3 text-sm font-black !text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:!bg-slate-800 dark:border-cyan-300/25 dark:!bg-cyan-300 dark:!text-slate-950 dark:shadow-cyan-300/15 dark:hover:!bg-cyan-200"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
              <Link
                to="/admin/events/new"
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/35 !bg-amber-300 px-4 py-3 text-sm font-black !text-amber-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:!bg-amber-200 dark:border-amber-200/25 dark:!bg-amber-300 dark:!text-slate-950 dark:shadow-amber-300/15"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tạo sự kiện
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={Tickets}
            label="Tổng vé"
            value={tickets.length}
            helper="Vé thuộc sự kiện đang chọn"
            tone="teal"
          />
          <StatCard
            icon={TicketCheck}
            label="Đã check-in"
            value={checkedInCount}
            helper={`${checkInRate}% đã qua cổng`}
            tone="emerald"
          />
          <StatCard
            icon={Gauge}
            label="Chưa check-in"
            value={pendingCount}
            helper="Còn cần xác nhận"
            tone="amber"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <form
            onSubmit={handleScan}
            className="relative overflow-hidden rounded-[2rem] border border-teal-600/20 bg-white/86 p-5 shadow-[0_20px_70px_rgba(15,118,110,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[#120b1f]/88 dark:shadow-[0_22px_80px_rgba(0,0,0,0.32)] sm:p-6"
          >
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-[4rem] bg-teal-300/25 dark:bg-cyan-300/10" aria-hidden="true" />
            <div className="relative space-y-5">
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl !bg-teal-700 !text-white shadow-lg shadow-teal-700/25 ring-1 ring-teal-900/10 dark:!bg-cyan-300 dark:!text-slate-950 dark:shadow-cyan-300/15 dark:ring-cyan-100/20">
                  <QrCode className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-xl font-black tracking-tight text-slate-950 dark:text-white">Quét hoặc nhập mã vé</h2>
                <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Form này được tối ưu cho thao tác nhanh tại cửa soát vé.
                </p>
              </div>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-teal-800 dark:text-cyan-100">Chọn sự kiện</span>
                <select
                  value={selectedEventId}
                  onChange={(event) => {
                    setSelectedEventId(event.target.value);
                    setScanMessage('');
                    setScanError('');
                    setLastCheckedTicket(null);
                  }}
                  className="mt-2 w-full rounded-2xl border border-teal-700/20 bg-white px-4 py-3 text-[16px] font-bold text-slate-950 shadow-sm outline-none transition [color-scheme:light] focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 dark:border-white/10 dark:bg-[#211a2b] dark:text-white dark:[color-scheme:dark] dark:focus:border-cyan-300 dark:focus:ring-cyan-300/15"
                >
                  {events.map((event) => (
                    <option
                      key={event.id}
                      value={event.id}
                      className="bg-white text-slate-950 dark:bg-[#211a2b] dark:text-white"
                    >
                      {event.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-teal-800 dark:text-cyan-100">QR Token / Mã vé</span>
                <div className="mt-2 flex overflow-hidden rounded-2xl border border-teal-700/20 bg-white shadow-sm ring-1 ring-transparent transition focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/15 dark:border-white/10 dark:bg-white/[0.08] dark:focus-within:border-cyan-300 dark:focus-within:ring-cyan-300/15">
                  <div className="grid w-12 shrink-0 place-items-center border-r border-teal-700/10 text-teal-700 dark:border-white/10 dark:text-cyan-200">
                    <QrCode className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <input
                    value={qrToken}
                    onChange={(event) => setQrToken(event.target.value)}
                    placeholder="Nhập QR token ở đây"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[16px] font-bold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                    autoComplete="off"
                  />
                </div>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="submit" disabled={scanLoading} className="min-h-12 rounded-2xl px-5 text-base font-black">
                  {scanLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Đang quét...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <TicketCheck className="h-4 w-4" aria-hidden="true" />
                      Xác nhận vé
                    </span>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setQrToken('');
                    setScanError('');
                    setScanMessage('');
                    setLastCheckedTicket(null);
                  }}
                  className="min-h-12 rounded-2xl border border-slate-900/10 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-200 dark:hover:bg-white/[0.12]"
                >
                  Xóa mã
                </button>
              </div>

              {scanMessage && (
                <StatusPanel icon={CheckCircle2} tone="success" title="Check-in thành công" message={scanMessage} />
              )}
              {scanError && (
                <StatusPanel icon={AlertTriangle} tone="danger" title="Không thể xác nhận vé" message={scanError} />
              )}
            </div>
          </form>

          <aside className="relative overflow-hidden rounded-[2rem] border border-amber-500/20 bg-white/82 p-5 shadow-[0_20px_70px_rgba(180,83,9,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.075] sm:p-6">
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-300/12" aria-hidden="true" />
            <div className="relative space-y-5">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-300 text-amber-950 shadow-lg shadow-amber-500/25">
                  <Wand2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Bảng điều phối cổng</h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                    Mỗi vé chỉ được xác nhận một lần. Sau khi thành công, danh sách vé bên dưới sẽ tự cập nhật trạng thái.
                  </p>
                </div>
              </div>

              {currentEvent && (
                <div className="rounded-[1.5rem] border border-teal-600/18 bg-gradient-to-br from-teal-50 to-amber-50 p-4 shadow-inner dark:border-cyan-300/12 dark:from-white/[0.08] dark:to-amber-300/[0.06]">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-teal-800 ring-1 ring-teal-600/15 dark:bg-white/[0.08] dark:text-cyan-100 dark:ring-white/10">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Sự kiện đang chọn
                  </div>
                  <div className="text-lg font-black text-slate-950 dark:text-white">{currentEvent.title}</div>
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-200" aria-hidden="true" />
                    <span>Bắt đầu: {currentEvent.start_time ? new Date(currentEvent.start_time).toLocaleString('vi-VN') : '—'}</span>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-900/10 bg-white/76 p-4 dark:border-white/10 dark:bg-white/[0.07]">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Tiến độ</div>
                  <div
                    className="mt-2 h-4 overflow-hidden rounded-full bg-emerald-100 shadow-inner ring-1 ring-emerald-700/15 dark:bg-white/15 dark:ring-white/10"
                    role="progressbar"
                    aria-valuenow={checkInRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full shadow-[0_0_18px_rgba(34,197,94,0.45)] transition-[width] duration-700 ease-out"
                      style={{
                        width: `${checkInRate}%`,
                        minWidth: checkInRate > 0 ? '0.875rem' : '0',
                        background: 'linear-gradient(90deg, #15803d 0%, #22c55e 58%, #86efac 100%)'
                      }}
                    />
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">{checkInRate}% hoàn tất</div>
                </div>
                <div className="rounded-2xl border border-slate-900/10 bg-white/76 p-4 dark:border-white/10 dark:bg-white/[0.07]">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Lần quét gần nhất</div>
                  <div className="mt-2 line-clamp-2 text-sm font-black text-slate-950 dark:text-white">
                    {lastCheckedTicket?.event_title || lastCheckedTicket?.ticket_id || 'Chưa có vé mới'}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-300">
                <Tickets className="h-3.5 w-3.5" aria-hidden="true" />
                Danh sách vận hành
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Danh sách vé</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {tickets.length} vé cho sự kiện hiện tại, {checkedInCount} vé đã check-in.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-rose-400/35 bg-rose-50 p-4 text-sm font-bold text-rose-800 dark:border-rose-300/20 dark:bg-rose-400/10 dark:text-rose-100">
              {error}
            </div>
          )}

          {tickets.length === 0 ? (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-teal-600/30 bg-teal-50/80 p-8 text-center dark:border-cyan-300/20 dark:bg-cyan-300/10">
              <Tickets className="mx-auto h-10 w-10 text-teal-700 dark:text-cyan-100" aria-hidden="true" />
              <div className="mt-3 text-base font-black text-slate-950 dark:text-white">Chưa có vé nào được bán</div>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Khi khách mua vé cho sự kiện này, danh sách sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {tickets.map((ticket) => (
                <TicketItem key={ticket.ticket_id} ticket={ticket} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, helper, tone }) {
  const iconClass = {
    teal: '!bg-teal-700 !text-white shadow-teal-700/25 ring-teal-900/10 dark:!bg-cyan-300 dark:!text-slate-950 dark:shadow-cyan-300/15 dark:ring-cyan-100/20',
    emerald: '!bg-emerald-700 !text-white shadow-emerald-700/25 ring-emerald-900/10 dark:!bg-emerald-300 dark:!text-slate-950 dark:shadow-emerald-300/15 dark:ring-emerald-100/20',
    amber: '!bg-amber-300 !text-amber-950 shadow-amber-700/20 ring-amber-600/15 dark:!bg-amber-300 dark:!text-slate-950 dark:shadow-amber-300/15 dark:ring-amber-100/20'
  }[tone];

  return (
    <div className="rounded-[1.6rem] border border-slate-900/10 bg-white/84 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07]">
      <div className="flex items-center gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-lg ring-1 ${iconClass}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 text-3xl font-black leading-none text-slate-950 dark:text-white">{value}</div>
          <div className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">{helper}</div>
        </div>
      </div>
    </div>
  );
}

function StatusPanel({ icon: Icon, tone, title, message }) {
  const classes =
    tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100'
      : 'border-rose-500/30 bg-rose-50 text-rose-900 dark:border-rose-300/20 dark:bg-rose-400/10 dark:text-rose-100';

  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${classes}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <div className="text-sm font-black">{title}</div>
        <div className="mt-0.5 text-sm font-semibold opacity-85">{message}</div>
      </div>
    </div>
  );
}
