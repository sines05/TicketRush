import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [scanMessage, setScanMessage] = useState('');

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
        if (!mounted) return;
        setLoading(false);
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
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedEventId]);

  const currentEvent = useMemo(() => events.find((item) => item.id === selectedEventId), [events, selectedEventId]);

  async function handleScan(event) {
    event.preventDefault();
    setScanMessage('');
    setError('');

    if (!qrToken.trim()) {
      setError('Nhập mã QR hoặc token vé để quét.');
      return;
    }

    setScanLoading(true);
    try {
      await ticketService.checkInTicket(qrToken.trim());
      setScanMessage('Vé đã được xác nhận thành công.');
      setQrToken('');
      const data = await ticketService.getAdminTickets(selectedEventId);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Quét vé thất bại');
    } finally {
      setScanLoading(false);
    }
  }

  if (loading) {
    return <Loading title="Đang tải dữ liệu check-in..." />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Admin Check-in</h1>
            <p className="mt-1 text-sm text-muted">Quét QR code vé hoặc nhập token thủ công để xác nhận khách.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/dashboard">
              <Button variant="secondary">Dashboard</Button>
            </Link>
            <Link to="/admin/events/new">
              <Button variant="secondary">Tạo sự kiện</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Chọn sự kiện</label>
              <select
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-text/20 bg-bg px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleScan} className="space-y-3">
              <div>
                <label className="text-sm font-semibold">QR Token / Mã vé</label>
                <input
                  value={qrToken}
                  onChange={(event) => setQrToken(event.target.value)}
                  placeholder="Nhập QR token ở đây"
                  className="mt-2 w-full rounded-lg border border-text/20 bg-bg px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button type="submit" disabled={scanLoading}>
                  {scanLoading ? 'Đang quét...' : 'Xác nhận vé'}
                </Button>
                {scanMessage && <div className="text-sm text-success">{scanMessage}</div>}
                {error && <div className="text-sm text-danger">{error}</div>}
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-text/10 bg-bg/40 p-4">
            <div className="text-sm font-semibold">Giới thiệu</div>
            <p className="mt-2 text-sm text-muted">
              Admin có thể xem danh sách vé đã bán cho sự kiện hiện tại và xác nhận vé bằng mã QR. Vé đã xác nhận sẽ không thể quét lại.
            </p>
            {currentEvent && (
              <div className="mt-4 rounded-xl border border-text/10 bg-surface p-4">
                <div className="text-sm font-semibold">Sự kiện đang chọn</div>
                <div className="mt-2 text-sm text-text">{currentEvent.title}</div>
                <div className="mt-1 text-xs text-muted">Bắt đầu: {currentEvent.start_time ? new Date(currentEvent.start_time).toLocaleString('vi-VN') : '—'}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Danh sách vé</h2>
            <p className="mt-1 text-sm text-muted">{tickets.length} vé cho sự kiện hiện tại.</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm">{error}</div>
        )}

        {tickets.length === 0 ? (
          <div className="mt-4 rounded-xl border border-text/10 bg-bg/40 p-5 text-sm text-muted">
            Chưa có vé nào được bán cho sự kiện này.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {tickets.map((ticket) => (
              <TicketItem key={ticket.ticket_id} ticket={ticket} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
