import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Loading from '../../components/common/Loading.jsx';
import Button from '../../components/common/Button.jsx';
import queueService from '../../services/queueService.js';
import { BookingContext } from '../../context/BookingContext.jsx';

export default function VirtualQueue() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startBooking } = useContext(BookingContext);

  const eventId = useMemo(() => searchParams.get('eventId') || '', [searchParams]);

  const [queueId, setQueueId] = useState('');
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) {
      setError('Thiếu eventId. Vui lòng quay lại và chọn sự kiện.');
      return;
    }

    startBooking(eventId);

    let stop = null;

    setQueueId(`queue-for-${eventId}`);

    stop = queueService.startPollingJoin({
      event_id: eventId,
      intervalMs: 1200,
      onUpdate: (st) => {
        if (st.status === 'WAITING') setPosition(st.queue_position ?? null);
        if (st.status === 'waiting') setPosition(st.position ?? null);
      },
      onPassed: () => {
        navigate(`/booking/seats?eventId=${eventId}`, {
          replace: true
        });
      },
      onError: (e) => {
        setError(e?.message || 'Lỗi khi polling hàng chờ');
      }
    });

    return () => {
      stop?.();
    };
  }, [eventId, navigate, startBooking]);

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
        <div className="text-xs text-muted">Queue</div>
        <div className="mt-1 text-sm font-semibold break-all">{queueId || '—'}</div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-text/10 bg-bg/40 p-3">
            <div className="text-xs text-muted">Vị trí</div>
            <div className="mt-1 text-lg font-semibold">{position ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-text/10 bg-bg/40 p-3">
            <div className="text-xs text-muted">Ước tính</div>
            <div className="mt-1 text-lg font-semibold">{position != null ? 'Polling...' : '—'}</div>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted">
          Contract: `POST /queue/join` một lần, sau đó poll `GET /queue/status` cho đến khi `allowed`.
        </div>
      </div>
    </div>
  );
}
