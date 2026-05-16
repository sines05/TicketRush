import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Loading from '../../components/common/Loading.jsx';
import Button from '../../components/common/Button.jsx';
import queueService from '../../services/queueService.js';
import { BookingContext } from '../../context/BookingContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import { useWebSocket } from '../../hooks/useWebSocket.js';

export default function VirtualQueue() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startBooking } = useContext(BookingContext);
  const { user } = useContext(AuthContext);

  const eventId = useMemo(() => searchParams.get('eventId') || '', [searchParams]);

  const [joinIndex, setJoinIndex] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState('');

  const position = useMemo(() => {
    if (joinIndex === null) return null;
    const pos = joinIndex - currentIndex;
    return pos > 0 ? pos : 1;
  }, [joinIndex, currentIndex]);

  const { status: wsStatus, setOnMessage, send: wsSend } = useWebSocket('/ws', {
    enabled: !!eventId && !!user
  });

  useEffect(() => {
    if (!eventId) {
      setError('Thiếu eventId. Vui lòng quay lại và chọn sự kiện.');
      return;
    }

    startBooking(eventId);

    // Join queue and get initial status
    const initQueue = async () => {
      try {
        const res = await queueService.joinQueue({ event_id: eventId });
        if (res.status === 'allowed') {
          navigate(`/booking/seats?eventId=${eventId}&queueToken=${res?.queue_token || ''}`, {
            replace: true,
            state: { allowedAt: res?.allowed_at }
          });
          return;
        }
        setJoinIndex(res.join_index);

        // If not allowed immediately, get current position
        const statusRes = await queueService.getStatus({ event_id: eventId });
        setJoinIndex(statusRes.join_index);
      } catch (err) {
        setError(err?.message || 'Lỗi khi tham gia hàng chờ');
      }
    };

    initQueue();
  }, [eventId, navigate, startBooking]);

  useEffect(() => {
    if (wsStatus === 'CONNECTED' && user?.user_id && eventId) {
      wsSend({ action: 'subscribe', channel: `user:${user.user_id}` });
      wsSend({ action: 'subscribe', channel: `event:${eventId}` });
    }
  }, [wsStatus, user?.user_id, eventId, wsSend]);

  useEffect(() => {
    setOnMessage((data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'QUEUE_PASSED' && message.event_id === eventId) {
          navigate(`/booking/seats?eventId=${eventId}&queueToken=${message.queue_token || ''}`, {
            replace: true,
            state: { allowedAt: message.allowed_at }
          });
        } else if (message.type === 'QUEUE_UPDATE' && message.event_id === eventId) {
          setCurrentIndex(message.current_index);
        }
      } catch (e) {
        // Ignore malformed messages
      }
    });
  }, [setOnMessage, eventId, navigate]);

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-danger/10 p-5">
        <div className="text-sm font-semibold">Không vào được hàng chờ</div>
        <div className="mt-2 text-sm text-muted">{error}</div>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate('/')}> 
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Loading
        title="Đang xếp hàng..."
        subtitle="TicketRush sẽ tự chuyển sang trang chọn ghế khi đến lượt."
      />

      <div className="mx-auto max-w-md rounded-xl border border-text/10 bg-surface p-5">
        <div className="text-xs text-muted">Trạng thái kết nối</div>
        <div className={`mt-1 text-sm font-semibold ${wsStatus === 'CONNECTED' ? 'text-success' : 'text-warning'}`}>
          {wsStatus === 'CONNECTED' ? 'Đã kết nối Realtime' : 'Đang kết nối...'}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-text/10 bg-bg/40 p-3">
            <div className="text-xs text-muted">Vị trí của bạn</div>
            <div className="mt-1 text-lg font-semibold">{position ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-text/10 bg-bg/40 p-3">
            <div className="text-xs text-muted">Ước tính</div>
            <div className="mt-1 text-lg font-semibold">{position != null ? 'Realtime' : '—'}</div>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted">
          Hệ thống đang sử dụng WebSocket để cập nhật vị trí hàng chờ theo thời gian thực.
        </div>
      </div>
    </div>
  );
}
