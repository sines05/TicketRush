import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import TicketItem from '../../components/tickets/TicketItem.jsx';
import { BookingContext } from '../../context/BookingContext.jsx';
import { useCountdown, formatCountdown } from '../../hooks/useCountdown.js';
import { formatVND } from '../../utils/formatters.js';
import eventService from '../../services/eventService.js';
import orderService from '../../services/orderService.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

function makeQrToken() {
  return `TICKETRUSH-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId') || '';
  const orderId = searchParams.get('orderId') || '';

  const { selectedSeats, clearBooking } = useContext(BookingContext);

  const orderFromState = location.state?.order || null;
  const [order] = useState(orderFromState);
  const { secondsLeft, isExpired } = useCountdown({ endsAt: order?.expires_at, seconds: 600 });

  const [event, setEvent] = useState(null);
  const [paid, setPaid] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    let mounted = true;
    eventService
      .getEventDetail(eventId)
      .then((evt) => {
        if (!mounted) return;
        setEvent(evt);
      })
      .catch(() => {
        // ignore in demo
      });

    return () => {
      mounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    // If navigated directly without state, require going back to SeatMap to lock again.
    if (!order && orderId) {
      setError('Thiếu thông tin đơn hàng. Vui lòng quay lại chọn ghế để giữ chỗ.');
    }
  }, [order, orderId]);

  const total = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  }, [selectedSeats]);

  useEffect(() => {
    if (isExpired && !paid) {
      clearBooking();
    }
  }, [isExpired, paid, clearBooking]);

  async function handlePay() {
    if (isExpired) return;

    if (!order?.order_id) {
      setError('Thiếu order_id.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await orderService.checkout({ order_id: order.order_id });

      if (!USE_MOCK) {
        setPaid(true);
        setTickets([]);
        return;
      }

      const created = selectedSeats.map((s) => {
        return {
          ticket_id: `uuid-ticket-${Math.random().toString(16).slice(2)}`,
          event_title: event?.title || 'TicketRush Event',
          zone_name: s.zone_name || 'Zone',
          seat_label: s.label || `${s.row_label}-${s.seat_number}`,
          qr_code_token: makeQrToken(),
          is_checked_in: false,
          // keep some extras for UI
          price: s.price,
          order_id: result.order_id
        };
      });

      setPaid(true);
      setTickets(created);
    } catch (e) {
      setError(e?.message || 'Thanh toán thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  if (!eventId) {
    return (
      <div className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="text-sm font-semibold">Thiếu eventId</div>
        <div className="mt-3">
          <Link to="/">
            <Button variant="secondary">Trang chủ</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (selectedSeats.length === 0 && !paid) {
    return (
      <div className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="text-sm font-semibold">Chưa chọn ghế</div>
        <div className="mt-1 text-sm text-muted">Vui lòng quay lại trang chọn ghế.</div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/booking/seats?eventId=${eventId}`)}>
            Chọn ghế
          </Button>
          <Link to="/">
            <Button variant="secondary">Trang chủ</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isExpired && !paid) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5">
        <div className="text-sm font-semibold">Hết thời gian giữ chỗ</div>
        <div className="mt-1 text-sm text-muted">Vui lòng chọn lại ghế để tiếp tục.</div>
        <div className="mt-4">
          <Button onClick={() => navigate(`/booking/seats?eventId=${eventId}`)}>Quay lại chọn ghế</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-text/10 bg-surface p-5 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Thanh toán</div>
            <div className="mt-1 text-xs text-muted">{event?.title}</div>
          </div>
          <div className="rounded-lg border border-text/10 bg-bg/40 px-3 py-2 text-sm">
            Còn lại: <span className="font-semibold">{formatCountdown(secondsLeft)}</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">{error}</div>
        )}

        {!paid ? (
          <div className="mt-5 space-y-3">
            {selectedSeats.map((s) => (
              <div
                key={s.seat_id || s.seatId}
                className="flex items-center justify-between rounded-xl border border-text/10 bg-bg/40 p-3"
              >
                <div>
                  <div className="text-sm font-semibold">{s.label || `${s.row_label}-${s.seat_number}`}</div>
                  <div className="mt-1 text-xs text-muted">{s.zone_name || 'Zone'}</div>
                </div>
                <div className="text-sm font-semibold">{formatVND(s.price)}</div>
              </div>
            ))}

            <div className="mt-4 rounded-xl border border-text/10 bg-bg/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Tổng cộng</span>
                <span className="font-semibold">{formatVND(total)}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => navigate(`/booking/seats?eventId=${eventId}`)}>
                  Sửa ghế
                </Button>
                <Button onClick={handlePay} disabled={submitting || !order?.order_id}>
                  {submitting ? 'Đang thanh toán...' : USE_MOCK ? 'Thanh toán (Demo)' : 'Thanh toán'}
                </Button>
              </div>
              <div className="mt-2 text-xs text-muted">
                Theo contract: gọi `POST /orders/checkout` với `order_id`.
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-success/40 bg-success/10 p-4">
              <div className="text-sm font-semibold">Thanh toán thành công</div>
              <div className="mt-1 text-sm text-muted">
                Vé QR Code đã được tạo{USE_MOCK ? '.' : ' trên hệ thống. Bạn có thể xem lại trong “Vé của tôi”.'}
              </div>
            </div>

            {tickets.length > 0 && (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <TicketItem key={t.ticket_id} ticket={t} />
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Link to="/">
                <Button variant="secondary">Trang chủ</Button>
              </Link>
              <Link to="/my-tickets">
                <Button>Xem vé của tôi</Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => {
                  clearBooking();
                  navigate('/');
                }}
              >
                Kết thúc
              </Button>
            </div>
          </div>
        )}
      </section>

      <aside className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="text-sm font-semibold">Lưu ý</div>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
          <li>Checkout có đếm ngược 10 phút (demo)</li>
          <li>Hết giờ sẽ xóa ghế đang giữ và yêu cầu chọn lại</li>
          <li>Vé hiển thị QR Code bằng thư viện</li>
        </ul>
      </aside>
    </div>
  );
}
