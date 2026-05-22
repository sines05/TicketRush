import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import queueService from '../../services/queueService.js';
import eventService from '../../services/eventService.js';
import { BookingContext } from '../../context/BookingContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import { 
  Users, 
  Zap, 
  Timer, 
  ArrowLeft, 
  ShieldCheck, 
  Loader2,
  Ticket,
  MapPin,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function VirtualQueue() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startBooking } = useContext(BookingContext);
  const { user } = useContext(AuthContext);

  const eventId = useMemo(() => searchParams.get('eventId') || '', [searchParams]);

  const [event, setEvent] = useState(null);
  const [joinIndex, setJoinIndex] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const position = useMemo(() => {
    if (joinIndex === null) return null;
    const pos = joinIndex - currentIndex;
    return pos > 0 ? pos : 0;
  }, [joinIndex, currentIndex]);

  const { status: wsStatus, setOnMessage, send: wsSend } = useWebSocket('/ws', {
    enabled: !!eventId && !!user
  });

  // Fail-safe: If currentIndex passes joinIndex, we should be allowed
  useEffect(() => {
    if (joinIndex !== null && currentIndex >= joinIndex && !error) {
      // Re-verify status with API to get the token
      queueService.getStatus({ event_id: eventId }).then(res => {
        if (res.status === 'allowed') {
          if (res.queue_token) {
            sessionStorage.setItem(`queue_token_${eventId}`, res.queue_token);
          }
          navigate(`/booking/seats?eventId=${eventId}&queueToken=${res.queue_token || ''}`, {
            replace: true,
            state: { allowedAt: res.allowed_at }
          });
        }
      }).catch(() => {});
    }
  }, [currentIndex, joinIndex, eventId, navigate, error]);

  useEffect(() => {
    if (!eventId) {
      setError('Thiếu eventId. Vui lòng quay lại và chọn sự kiện.');
      setIsInitialLoading(false);
      return;
    }

    startBooking(eventId);

    // Fetch event detail for better UI
    eventService.getEventDetail(eventId).then(setEvent).catch(() => {});

    // Join queue and get initial status
    const initQueue = async () => {
      try {
        const res = await queueService.joinQueue({ event_id: eventId });
        if (res.status === 'allowed') {
          if (res.queue_token) {
            sessionStorage.setItem(`queue_token_${eventId}`, res.queue_token);
          }
          navigate(`/booking/seats?eventId=${eventId}&queueToken=${res?.queue_token || ''}`, {
            replace: true,
            state: { allowedAt: res?.allowed_at }
          });
          return;
        }
        setJoinIndex(res.join_index);
        setCurrentIndex(res.current_processed_index || 0);

        // If not allowed immediately, get current position
        const statusRes = await queueService.getStatus({ event_id: eventId });
        setJoinIndex(statusRes.join_index);
        setCurrentIndex(statusRes.current_processed_index || 0);
      } catch (err) {
        setError(err?.message || 'Lỗi khi tham gia hàng chờ');
      } finally {
        setIsInitialLoading(false);
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

  if (isInitialLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Đang khởi tạo hàng chờ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md mt-20">
        <div className="rounded-[32px] border border-rose-500/20 bg-rose-500/5 p-8 text-center backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-500">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-foreground mb-2">Hàng chờ tạm gián đoạn</h2>
          <p className="text-sm font-medium text-muted-foreground mb-8 leading-relaxed">{error}</p>
          <Button variant="danger" className="w-full h-12 rounded-2xl shadow-lg shadow-rose-500/20" onClick={() => navigate('/')}> 
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại trang chủ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-secondary/10 blur-[120px]" />
      
      <div className="relative w-full max-w-xl">
        {/* Header Event Info */}
        {event && (
          <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-700">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">
              <Sparkles className="h-3 w-3" />
              Sự kiện đang Hot
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mb-2 line-clamp-1">{event.title}</h1>
            <div className="flex items-center justify-center gap-4 text-xs font-bold text-muted-foreground/80">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {event.location}
              </div>
              <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <div className="flex items-center gap-1.5 text-primary">
                <Ticket className="h-3.5 w-3.5" /> Đang mở bán
              </div>
            </div>
          </div>
        )}

        {/* Main Queue Card */}
        <div className="rounded-[40px] border border-white/10 dark:border-white/5 bg-white/70 dark:bg-black/40 p-8 md:p-12 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center">
            {/* Position Display */}
            <div className="relative mb-10">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 scale-150 duration-[3000ms]" />
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary p-1 shadow-2xl shadow-primary/30">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Vị trí</span>
                  <span className="text-4xl font-black text-foreground tabular-nums leading-none">
                    {position === 0 ? 1 : (position ?? '—')}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2 mb-10">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                {position === 0 ? "🎉 Đã đến lượt bạn!" : "Bạn đang trong hàng chờ"}
              </h2>
              <p className="text-sm font-semibold text-muted-foreground/80 max-w-sm mx-auto">
                {position === 0 
                  ? "Hệ thống đang đưa bạn vào phòng vé, vui lòng đợi trong giây lát..." 
                  : "Hệ thống sẽ tự động đưa bạn đến trang chọn ghế ngay khi đến lượt. Đừng tắt trình duyệt nhé!"}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="rounded-3xl border border-white/20 bg-primary/5 p-5 transition-all hover:bg-primary/10">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                  <Zap className="h-3 w-3" /> Cập nhật
                </div>
                <div className="text-lg font-black text-foreground">Real-time</div>
                <div className={cn("mt-1 text-[10px] font-bold uppercase", wsStatus === 'CONNECTED' ? "text-emerald-500" : "text-amber-500 animate-pulse")}>
                  {wsStatus === 'CONNECTED' ? 'Đã kết nối' : 'Đang kết nối...'}
                </div>
              </div>

              <div className="rounded-3xl border border-white/20 bg-secondary/5 p-5 transition-all hover:bg-secondary/10">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-secondary mb-2">
                  <Timer className="h-3 w-3" /> Ước tính
                </div>
                <div className="text-lg font-black text-foreground">~ 1 phút</div>
                <div className="mt-1 text-[10px] font-bold text-muted-foreground/60 uppercase">Dựa trên tốc độ</div>
              </div>
            </div>

            {/* Progress Bar (Fake but provides feedback) */}
            <div className="mt-10 w-full">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Tiến độ</span>
                <span className="text-[10px] font-black text-primary uppercase">Càng gần lượt bạn</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted/20 p-1">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(var(--tr-primary),0.5)]" 
                  style={{ width: `${Math.min(95, Math.max(5, (1 - (position || 0)/1000) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Tip */}
        <div className="mt-8 flex items-center justify-center gap-3 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-300">
          <Users className="h-3.5 w-3.5" />
          <span>Hơn 2,000 người khác cũng đang săn vé</span>
        </div>
      </div>
    </div>
  );
}
