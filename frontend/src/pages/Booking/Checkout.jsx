import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card.jsx';
import TicketItem from '../../components/tickets/TicketItem.jsx';
import { BookingContext } from '../../context/BookingContext.jsx';
import { useCountdown, formatCountdown } from '../../hooks/useCountdown.js';
import { formatVND } from '../../utils/formatters.js';
import eventService from '../../services/eventService.js';
import orderService from '../../services/orderService.js';
import notificationService from '../../services/notificationService.js';
import { Clock, AlertCircle, CheckCircle2, ArrowLeft, CreditCard, Info } from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId') || '';
  const orderId = searchParams.get('orderId') || '';

  const { selectedSeats, clearBooking, clearSelection, toggleSeat } = useContext(BookingContext);

  const orderFromState = location.state?.order || null;
  const [order, setOrder] = useState(orderFromState);
  const { secondsLeft, isExpired } = useCountdown({ endsAt: order?.expires_at, seconds: 600 });

  const [event, setEvent] = useState(null);
  const [paid, setPaid] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFetchingOrder, setIsFetchingOrder] = useState(false);

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
        // ignore
      });

    return () => {
      mounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!order && orderId) {
      setIsFetchingOrder(true);
      orderService.getOrder(orderId)
        .then(res => {
          if (res) {
            setOrder(res);
            // Also sync context selected seats if they are missing
            if (selectedSeats.length === 0 && res.order_items) {
               res.order_items.forEach(item => {
                  if (item.seat) {
                     toggleSeat({
                        ...item.seat,
                        zone_id: item.seat.zone_id,
                        price: item.price,
                        label: `${item.seat.row_label}-${item.seat.seat_number}`
                     });
                  }
               });
            }
          }
        })
        .catch(err => {
          setError(err?.message || 'Không thể tải thông tin đơn hàng. Vui lòng quay lại chọn ghế.');
        })
        .finally(() => setIsFetchingOrder(false));
    }
  }, [order, orderId, selectedSeats.length, toggleSeat]);

  const total = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  }, [selectedSeats]);

  useEffect(() => {
    if (isExpired && !paid) {
      clearBooking();
    }
  }, [isExpired, paid, clearBooking]);

  async function handleEditSeats() {
    if (order?.order_id) {
      try {
        await orderService.cancelOrder({ order_id: order.order_id });
      } catch {
        // Best-effort
      }
    }
    clearBooking();
    navigate(`/booking/seats?eventId=${eventId}`);
  }

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

      notificationService.showLocalNotification(
        'Thanh toán thành công!',
        `Bạn đã đặt thành công ${selectedSeats.length} vé cho sự kiện ${event?.title || ''}.`
      );

      clearSelection();
      setPaid(true);
      setTickets(result.tickets || []);
    } catch (e) {
      setError(e?.message || 'Thanh toán thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  if (isFetchingOrder) return <Loading title="Đang khôi phục đơn hàng..." />;

  if (!eventId) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Thiếu thông tin
          </CardTitle>
          <CardDescription>Không tìm thấy mã sự kiện để tiếp tục thanh toán.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline">
            <Link to="/">Quay lại Trang chủ</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (selectedSeats.length === 0 && !paid) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Chưa chọn ghế
          </CardTitle>
          <CardDescription>Vui lòng quay lại trang chọn ghế để tiếp tục.</CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-2">
          <Button onClick={() => navigate(`/booking/seats?eventId=${eventId}`)}>
            Chọn ghế
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Trang chủ</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (isExpired && !paid) {
    return (
      <Card className="max-w-md mx-auto mt-10 border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Hết thời gian giữ chỗ
          </CardTitle>
          <CardDescription>Thời gian giữ chỗ của bạn đã hết. Vui lòng chọn lại ghế.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => navigate(`/booking/seats?eventId=${eventId}`)}>
            Quay lại chọn ghế
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thanh toán</h1>
          <p className="text-muted-foreground">{event?.title}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Thông tin đơn hàng</CardTitle>
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Clock className="h-3.5 w-3.5" />
                Còn lại: {formatCountdown(secondsLeft)}
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {!paid ? (
                <div className="space-y-4">
                  <div className="divide-y divide-border rounded-lg border">
                    {selectedSeats.map((s) => (
                      <div
                        key={s.seat_id || s.seatId}
                        className="flex items-center justify-between p-4"
                      >
                        <div>
                          <div className="font-medium">{s.label || `${s.row_label}-${s.seat_number}`}</div>
                          <div className="text-sm text-muted-foreground">{s.zone_name || 'Zone'}</div>
                        </div>
                        <div className="font-semibold">{formatVND(s.price)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center justify-between font-bold">
                      <span>Tổng cộng</span>
                      <span className="text-xl text-primary">{formatVND(total)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button variant="outline" onClick={handleEditSeats} className="flex-1">
                      Sửa ghế
                    </Button>
                    <Button 
                      onClick={handlePay} 
                      disabled={submitting || !order?.order_id}
                      className="flex-1"
                    >
                      {submitting ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Thanh toán ngay
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground">
                    Bằng cách nhấn thanh toán, bạn đồng ý với Điều khoản & Chính sách của TicketRush.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 py-4">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="rounded-full bg-success/10 p-3 text-success">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h2 className="text-xl font-bold">Thanh toán thành công!</h2>
                    <p className="text-muted-foreground">
                      Cảm ơn bạn đã đặt vé. Vé QR Code đã được tạo và sẵn sàng sử dụng.
                    </p>
                  </div>

                  {tickets.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Vé của bạn</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {tickets.map((t) => (
                          <TicketItem key={t.ticket_id} ticket={t} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 justify-center pt-4">
                    <Button asChild variant="outline">
                      <Link to="/">Về Trang chủ</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/my-tickets">Xem vé của tôi</Link>
                    </Button>
                    <Button
                      variant="ghost"
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lưu ý quan trọng</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <div className="flex gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <p>Bạn có 10 phút để hoàn tất thanh toán. Sau thời gian này, ghế sẽ được giải phóng cho người khác.</p>
              </div>
              <div className="flex gap-3">
                <CreditCard className="h-5 w-5 text-primary shrink-0" />
                <p>Hệ thống hỗ trợ nhiều phương thức thanh toán: Thẻ nội địa, Thẻ quốc tế, Ví điện tử.</p>
              </div>
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-primary shrink-0" />
                <p>Vui lòng không tải lại trang trong quá trình xử lý thanh toán.</p>
              </div>
            </CardContent>
          </Card>

          {!paid && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Cần hỗ trợ?</p>
                  <p className="text-xs text-muted-foreground">Liên hệ hotline 1900 xxxx hoặc chat với chúng tôi.</p>
                  <Button variant="link" size="sm" className="h-auto p-0">Trung tâm trợ giúp</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
