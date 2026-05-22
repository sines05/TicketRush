import { useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import SeatIcon from '../../components/SeatIcon.tsx';
import {
  generateBanquet,
  generateChevron,
  generateSemiCircle,
  generateTheatreAuditorium,
} from '../../components/SeatBuilder/shapeGenerators.ts';
import { Button } from '../../components/ui/button.jsx';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card.jsx';
import Loading from '../../components/common/Loading.jsx';
import { BookingContext } from '../../context/BookingContext.jsx';
import eventService from '../../services/eventService.js';
import queueService from '../../services/queueService.js';
import { formatVND } from '../../utils/formatters.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useCountdown, formatCountdown } from '../../hooks/useCountdown.js';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import orderService from '../../services/orderService.js';
import { 
  ArrowLeft, 
  Trash2, 
  X, 
  AlertCircle, 
  Clock, 
  Armchair, 
  Ticket, 
  Plus, 
  Minus, 
  Maximize2,
  Calendar,
  MapPin,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog.jsx";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

function seatLabel(seat) {
  return `${seat.row_label}-${seat.seat_number}`;
}

function seatCoordKey(rowLabel, seatNumber) {
  const row = typeof rowLabel === 'string' ? rowLabel : '';
  const n = Number(seatNumber);
  if (!row || !Number.isFinite(n)) return '';
  return `${row}${Math.max(1, Math.floor(n))}`;
}

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 1000;

export default function SeatMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedSeats, toggleSeat, clearSelection, startBooking, removeSeats } =
    useContext(BookingContext);
  const { user } = useAuth();

  const [theme, setTheme] = useState(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(next);
    localStorage.setItem('tr_theme', next);
  }, [theme]);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [allowedAt, setAllowedAt] = useState(location.state?.allowedAt);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [pendingOrder, setPendingOrder] = useState(null);

  const eventId = useMemo(() => searchParams.get('eventId') || '', [searchParams]);
  const urlQueueToken = searchParams.get('queueToken') || '';
  
  // Persistence: Get token from session storage if missing in URL
  const queueToken = useMemo(() => {
    return urlQueueToken || sessionStorage.getItem(`queue_token_${eventId}`) || '';
  }, [urlQueueToken, eventId]);

  // Recovery: Check for existing pending order on mount
  useEffect(() => {
    if (!eventId || !user) return;
    
    orderService.getPendingOrder({ event_id: eventId })
      .then(res => {
        if (res && res.order_id) {
          setPendingOrder(res);
        }
      })
      .catch(() => {});
  }, [eventId, user]);

  const [selected, setSelected] = useState(() => new Set());
  const [zoom, setZoom] = useState(1.0);

  // Force HTML zoom to 100% for SeatMap page only, then restore to 90% on leave
  useEffect(() => {
    const originalZoom = document.documentElement.style.zoom || '90%';
    document.documentElement.style.zoom = '100%';
    
    return () => {
      document.documentElement.style.zoom = originalZoom;
    };
  }, []);

  // Auto-scale on mount and window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasWrapperRef.current) {
        const wrapper = canvasWrapperRef.current;
        const availableWidth = wrapper.clientWidth - 40;
        const availableHeight = wrapper.clientHeight - 40;
        
        // Much more aggressive zoom calculation to avoid the 78% trap
        const scaleX = availableWidth / 900; // Focus on a tighter 900px wide area
        const scaleY = availableHeight / 650;
        const autoZoom = Math.min(scaleX, scaleY, 1.4); 
        
        setZoom(Math.max(0.75, autoZoom));
      }
    };

    // Initial scale after a short delay to ensure clientWidth/Height are ready
    const timer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [loading]); // Run after loading finishes

  // Dragging / Panning State for Seat Canvas
  const canvasWrapperRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  const handleMouseDown = useCallback((e) => {
    // Only drag on left click and not on a button/interactive element
    if (e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('a')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    if (canvasWrapperRef.current) {
      setScrollStart({
        left: canvasWrapperRef.current.scrollLeft,
        top: canvasWrapperRef.current.scrollTop
      });
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !canvasWrapperRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    canvasWrapperRef.current.scrollLeft = scrollStart.left - dx;
    canvasWrapperRef.current.scrollTop = scrollStart.top - dy;
  }, [isDragging, dragStart, scrollStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e) => {
    // Zoom with Ctrl + Wheel
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      setZoom((prev) => {
        const next = prev + (delta > 0 ? 0.05 : -0.05);
        return Math.max(0.5, Math.min(2.0, next));
      });
    }
  }, []);

  // Center canvas on load and when zoom changes (first time)
  useEffect(() => {
    if (seatMap && canvasWrapperRef.current) {
      const timer = setTimeout(() => {
        const wrapper = canvasWrapperRef.current;
        if (!wrapper) return;
        
        const canvasActualWidth = CANVAS_WIDTH * zoom;
        const canvasActualHeight = CANVAS_HEIGHT * zoom;
        
        const scrollX = (canvasActualWidth - wrapper.clientWidth) / 2;
        const scrollY = (canvasActualHeight - wrapper.clientHeight) / 2;
        
        wrapper.scrollLeft = Math.max(0, scrollX);
        wrapper.scrollTop = Math.max(0, scrollY);
      }, 150); // Slightly longer delay to ensure auto-scale has applied
      return () => clearTimeout(timer);
    }
  }, [seatMap, zoom]);

  useEffect(() => {
    const next = new Set();
    for (const s of selectedSeats || []) {
      const id = s?.seat_id || s?.seatId;
      if (id) next.add(id);
    }
    setSelected(next);
  }, [selectedSeats]);

  // Countdown timer logic
  useEffect(() => {
    if (!allowedAt && eventId) {
      queueService.getStatus({ event_id: eventId })
        .then(st => {
          if (st.allowed_at) {
            setAllowedAt(st.allowed_at);
          } else {
            setAllowedAt(new Date().toISOString());
          }
        })
        .catch(() => {
          setAllowedAt(new Date().toISOString());
        });
    }
  }, [allowedAt, eventId]);

  const targetTime = useMemo(() => {
    if (!allowedAt) return null;
    const date = new Date(allowedAt);
    date.setMinutes(date.getMinutes() + 15);
    return date.toISOString();
  }, [allowedAt]);

  const { secondsLeft, isExpired } = useCountdown({ endsAt: targetTime });

  // WebSocket real-time seat updates
  const { status: wsStatus, setOnMessage, send } = useWebSocket('/ws', { 
    enabled: !!eventId
  });

  // Handle subscription
  useEffect(() => {
    if (wsStatus === 'CONNECTED' && eventId) {
      send({ action: 'subscribe', channel: `event:${eventId}` });
    }
  }, [wsStatus, eventId, send]);

  // Register the WebSocket message handler
  useEffect(() => {
    setOnMessage((data) => {
      try {
        const msg = JSON.parse(data);
        if (!msg.type) return;

        const type = msg.type;
        const targetIds = msg.seat_ids || (msg.seat_id ? [msg.seat_id] : []);
        if (targetIds.length === 0) return;

        // CART EVICTION: If someone else locked/sold seats that I have in my cart, remove them
        const isOtherUser = msg.user_id && msg.user_id !== user?.user_id;
        if (isOtherUser && (type.includes('LOCKED') || type.includes('SOLD'))) {
          const inCart = targetIds.filter(id => selected.has(id));
          if (inCart.length > 0) {
            removeSeats(inCart);
            setConflictMessage("Một số ghế bạn chọn đã được người khác giữ hoặc đặt mất.");
            setIsConflictModalOpen(true);
          }
        }

        setSeatMap((prev) => {
          if (!prev) return prev;
          
          let changed = false;
          const nextZones = prev.zones.map((zone) => {
            let zoneChanged = false;
            const nextSeats = zone.seats.map((seat) => {
              if (!targetIds.includes(seat.seat_id)) return seat;
              
              zoneChanged = true;
              changed = true;
              
              switch (type) {
                case 'SEAT_LOCKED':
                case 'SEATS_LOCKED':
                  return { ...seat, status: 'LOCKED' };
                case 'SEAT_SOLD':
                case 'SEATS_SOLD':
                  return { ...seat, status: 'SOLD' };
                case 'SEAT_RELEASED':
                case 'SEATS_RELEASED':
                  return { ...seat, status: 'AVAILABLE', locked_by_user_id: null };
                default:
                  return seat;
              }
            });
            
            return zoneChanged ? { ...zone, seats: nextSeats } : zone;
          });

          return changed ? { ...prev, zones: nextZones } : prev;
        });
      } catch {
        // Ignore malformed messages
      }
    });
  }, [setOnMessage, selected, removeSeats, user?.user_id]);

  useEffect(() => {
    if (!eventId) {
      setError('Thiếu eventId.');
      setLoading(false);
      return;
    }

    startBooking(eventId);

    let mounted = true;

    Promise.all([eventService.getEventDetail(eventId), eventService.getSeatMap(eventId)])
      .then(([evt, sm]) => {
        if (!mounted) return;
        setEvent(evt);
        setSeatMap(sm);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Không tải được sơ đồ ghế');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [eventId, startBooking]);

  const zones = useMemo(() => seatMap?.zones ?? [], [seatMap]);

  // Precompute vertical offsets for zones to prevent overlap
  const zoneVerticalOffsets = useMemo(() => {
    let currentY = 120; // Start below the stage
    const containerGap = 55; // Space between zone boxes to fit the label (-top-7)
    
    return zones.map((z) => {
      const meta = z?.layout_meta || {};
      if (Number.isFinite(Number(meta?.pos_y))) return null;

      let zoneContentHeight = 0;
      const seats = z?.seats || [];
      const rowSet = new Set();
      seats.forEach(s => rowSet.add(s.row_label));
      const rowCount = rowSet.size || 1;
      
      const rawType = meta?.shape_type || meta?.shapeType || z?.shape_type || z?.shapeType;
      if (rawType === 'banquet') {
        const tables = Number(meta?.shape_params?.tableCount || 3);
        zoneContentHeight = Math.ceil(tables / 3) * 200; 
      } else if (rawType && rawType !== 'standing_block') {
        zoneContentHeight = rowCount * 42 + 20; 
      } else {
        // Standard Grid Box: Rows*28 + Gaps*12 + Padding(2*24)
        zoneContentHeight = (rowCount * 28) + ((rowCount - 1) * 12) + 48;
      }

      const pos = currentY;
      currentY += zoneContentHeight + containerGap;
      return pos;
    });
  }, [zones]);

  // Position zones inside the canvas using percentage bounds mapped to virtual coordinates
  const getZonePos = useCallback((zone, index, total) => {
    const meta = zone?.layout_meta || {};
    const x = Number(meta?.pos_x);
    const y = Number(meta?.pos_y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    }

    // Use precomputed pixel-based vertical offsets for fallback stacking
    const pixelY = zoneVerticalOffsets[index];
    if (pixelY !== null && pixelY !== undefined) {
      // Map pixel Y back to 0-100 range for the existing logic if needed, 
      // or just return as is if we change the caller. 
      // Let's return as a direct pixel indicator by using a high value or negative
      return { x: 50, y: (pixelY / CANVAS_HEIGHT) * 100 };
    }

    return { x: 50, y: 15 + index * 25 };
  }, [zoneVerticalOffsets]);

  const toggleSelectedSeatId = useCallback((seatId) => {
    if (!seatId) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else next.add(seatId);
      return next;
    });
  }, []);

  // Precompute layout specifications for ALL zones dynamically
  const zonesLayouts = useMemo(() => {
    return zones.map((zone) => {
      const meta = zone?.layout_meta || {};
      const rawType = meta?.shape_type || meta?.shapeType || zone?.shape_type || zone?.shapeType;
      const shapeType = typeof rawType === 'string' ? rawType : '';
      const rawParams = meta?.shape_params || meta?.shapeParams;
      const shapeParams = rawParams && typeof rawParams === 'object' ? rawParams : {};
      
      const align = meta?.align === 'right' || meta?.align === 'left' || meta?.align === 'center' ? meta.align : 'left';
      const style = meta?.style === 'center_aisle' || meta?.style === 'three_blocks' || meta?.style === 'plain' ? meta.style : 'plain';
      const aisleSize = Math.max(1, Math.min(6, Number(meta?.aisle_size) || 2));
      const gridLayout = { align, style, aisleSize };

      const color = meta?.color || zone?.color || '#3b82f6';
      
      let standingInfo = null;
      if (shapeType === 'standing_block') {
        const seats = zone?.seats ?? [];
        const available = seats.filter(s => s.status === 'AVAILABLE').length;
        const total = seats.length;
        standingInfo = { available, total, seats };
      }

      let shapeLayout = null;
      if (shapeType && shapeType !== 'standing_block') {
        const seats = zone?.seats ?? [];
        const byRow = new Map();
        for (const s of seats) {
          const key = s?.row_label;
          if (!key) continue;
          byRow.set(key, (byRow.get(key) || 0) + 1);
        }
        const inferredRows = byRow.size || 1;
        const inferredMax = Math.max(1, ...Array.from(byRow.values()));

        const result = (() => {
          if (shapeType === 'theatre') {
            const rows = Number(shapeParams.rows) || inferredRows;
            const seatsPerRow = Number(shapeParams.seatsPerRow) || inferredMax;
            return generateTheatreAuditorium(rows, seatsPerRow);
          }
          if (shapeType === 'semi_circle') {
            const rows = Number(shapeParams.rows) || inferredRows;
            const seatsPerRow = Number(shapeParams.seatsPerRow) || inferredMax;
            const arcAngle = Number(shapeParams.arcAngle) || 160;
            return generateSemiCircle(rows, seatsPerRow, arcAngle);
          }
          if (shapeType === 'banquet') {
            const tableCount = Number(shapeParams.tableCount ?? shapeParams.tablesCount) || inferredRows;
            const seatsPerTable = Number(shapeParams.seatsPerTable) || inferredMax;
            const tableRadius = Number(shapeParams.tableRadius) || 34;
            return generateBanquet(tableCount, seatsPerTable, tableRadius);
          }
          if (shapeType === 'chevron') {
            const rows = Number(shapeParams.rows) || inferredRows;
            const perSide = Number(shapeParams.seatsPerRow) || Math.max(1, Math.floor(inferredMax / 2));
            const angle = Number(shapeParams.angle) || 30;
            return generateChevron(rows, perSide, angle);
          }
          return null;
        })();

        if (result) {
          const coordById = new Map();
          for (const c of result.seats || []) {
            coordById.set(c.id, c);
          }
          shapeLayout = { shapeType, result, coordById };
        }
      }

      // If it's a grid (or shape generation fallback)
      let gridRows = [];
      if (!shapeLayout) {
        const seats = zone.seats ?? [];
        const rows = new Map();
        let maxSeatCount = 0;

        for (const s of seats) {
          const key = s.row_label;
          const list = rows.get(key) ?? [];
          list.push(s);
          rows.set(key, list);
        }

        const sortedRowLabels = [...rows.keys()].sort();
        const sortedRows = sortedRowLabels.map((rowLabel) => {
          const list = (rows.get(rowLabel) ?? []).slice().sort((a, b) => a.seat_number - b.seat_number);
          maxSeatCount = Math.max(maxSeatCount, list.length);
          return { rowLabel, seats: list };
        });

        gridRows = sortedRows.map((r) => {
          const seatsInRow = r.seats;
          const seatCount = seatsInRow.length;
          const aisleCount = style === 'three_blocks' ? 2 : style === 'center_aisle' ? 1 : 0;
          const totalCols = Math.max(0, Number(maxSeatCount) || 0) + aisleCount * aisleSize;
          const baseCols = seatCount + aisleCount * aisleSize;
          const pad = Math.max(0, totalCols - baseCols);
          const leftPad = align === 'right' ? pad : align === 'center' ? Math.floor(pad / 2) : 0;
          const rightPad = pad - leftPad;

          const blocks = (() => {
            if (style === 'center_aisle') {
              const left = Math.floor(seatCount / 2);
              return [left, seatCount - left];
            }
            if (style === 'three_blocks') {
              const base = Math.floor(seatCount / 3);
              const rem = seatCount - base * 3;
              const out = [base, base, base];
              const order = [1, 0, 2];
              for (let i = 0; i < rem; i++) out[order[i]] += 1;
              return out;
            }
            return [seatCount];
          })();

          const cells = [];
          for (let i = 0; i < leftPad; i++) cells.push(null);

          let idx = 0;
          for (let b = 0; b < blocks.length; b++) {
            const take = blocks[b];
            for (let i = 0; i < take; i++) {
              cells.push(seatsInRow[idx++] || null);
            }
            if (b < blocks.length - 1) {
              for (let i = 0; i < aisleSize; i++) cells.push(null);
            }
          }

          for (let i = 0; i < rightPad; i++) cells.push(null);
          return { rowLabel: r.rowLabel, cells, cols: totalCols };
        });
      }

      return {
        zone,
        color,
        shapeLayout,
        gridRows,
        gridLayout,
        standingInfo,
      };
    });
  }, [zones]);

  const total = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  }, [selectedSeats]);

  const handleCreateOrder = useCallback(async () => {
    if (!eventId || selectedSeats.length === 0) return;
    setError('');
    setSubmitting(true);

    try {
      const seat_ids = selectedSeats.map((s) => s.seat_id || s.seatId).filter(Boolean);
      const order = await orderService.lockSeats({
        event_id: eventId,
        seat_ids,
        queue_token: queueToken || null,
        selectedSeats
      });

      navigate(`/booking/checkout?eventId=${eventId}&orderId=${order.order_id}`, {
        state: { order, eventId },
        replace: false
      });
    } catch (e) {
      if (e?.errorCode === 'SEAT_ALREADY_TAKEN') {
        setConflictMessage(e?.message || 'Một vài ghế bạn chọn không khả dụng nữa, vui lòng chọn lại');
        setIsConflictModalOpen(true);
      } else {
        setError(e?.message || 'Không giữ được ghế.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [eventId, selectedSeats, queueToken, navigate]);

  // Zoom handlers
  const handleZoomIn = () => setZoom(prev => Math.min(2.0, prev + 0.15));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.15));
  const handleZoomReset = () => setZoom(1.0);

  // Formatting variables for Sidebar Event Details
  const formattedDate = useMemo(() => {
    if (!event?.start_time) return 'Đang cập nhật';
    return format(new Date(event.start_time), 'EEEE, dd/MM/yyyy', { locale: vi });
  }, [event]);

  const formattedTime = useMemo(() => {
    if (!event?.start_time) return 'Đang cập nhật';
    return format(new Date(event.start_time), 'HH:mm');
  }, [event]);

  if (loading) return <Loading title="Đang tải sơ đồ ghế..." />;

  if (error && !event) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card className="max-w-md mx-auto border-destructive/50 bg-destructive/5 glass-surface">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Không tải được sơ đồ ghế
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{error}</p>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Quay lại</Button>
            <Button asChild>
              <Link to="/">Về Trang chủ</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden bg-background text-foreground custom-scrollbar">
      {/* Dialogs */}
      
      {/* Recovery Dialog: Pending Order Found */}
      <Dialog open={!!pendingOrder} onOpenChange={() => setPendingOrder(null)}>
        <DialogContent className="sm:max-w-md glass-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-black text-xl">
              <Clock className="h-6 w-6 animate-pulse" />
              Khôi phục phiên đặt vé
            </DialogTitle>
            <DialogDescription className="pt-3 text-slate-700 dark:text-slate-200 font-bold text-base leading-relaxed">
              Chào bạn, chúng tôi thấy bạn đang có một đơn hàng chưa hoàn tất cho sự kiện này. 
              Các ghế của bạn vẫn đang được giữ chỗ an toàn.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 px-1">
             <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                   <span className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Đơn hàng</span>
                   <span className="font-mono text-[10px]">{pendingOrder?.order_id?.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-sm font-black text-slate-900 dark:text-white">Tổng cộng</span>
                   <span className="text-lg font-black text-brand-600">{formatVND(pendingOrder?.total_amount)}</span>
                </div>
             </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setPendingOrder(null)}>
              Bỏ qua
            </Button>
            <Button 
              className="flex-1 rounded-xl shadow-lg shadow-brand-600/20" 
              onClick={() => {
                navigate(`/booking/checkout?eventId=${eventId}&orderId=${pendingOrder.order_id}`, {
                  state: { order: pendingOrder }
                });
              }}
            >
              Tiếp tục thanh toán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!allowedAt && isExpired}>
        <DialogContent className="sm:max-w-md glass-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Phiên làm việc hết hạn
            </DialogTitle>
            <DialogDescription>
              Thời gian chọn ghế của bạn đã kết thúc. Vui lòng quay lại hàng chờ để tiếp tục.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
              Về trang chủ
            </Button>
            <Button 
              onClick={() => navigate(`/events/${event?.slug || eventId}`)} 
              className="flex-1 shadow-lg shadow-primary/20"
            >
              Quay lại hàng chờ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConflictModalOpen} onOpenChange={(open) => {
        setIsConflictModalOpen(open);
        if (!open) {
          clearSelection();
        }
      }}>
        <DialogContent className="sm:max-w-md glass-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-black text-xl">
              <AlertCircle className="h-6 w-6" />
              Ghế không khả dụng
            </DialogTitle>
            <DialogDescription className="pt-3 text-slate-700 dark:text-slate-200 font-bold text-base leading-relaxed">
              {conflictMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={() => {
                setIsConflictModalOpen(false);
                clearSelection();
              }} 
              className="w-full shadow-lg shadow-primary/20"
            >
              Đã hiểu, để tôi chọn lại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal Mini Header */}
      <header className="h-16 border-b border-border bg-card px-4 md:px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-foreground uppercase">Chọn ghế</h1>
              <span className="relative flex h-2 w-2">
                {wsStatus === 'CONNECTED' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={cn("relative inline-flex rounded-full h-2 w-2", 
                  wsStatus === 'CONNECTED' ? 'bg-emerald-500' :
                  wsStatus === 'CONNECTING' ? 'bg-amber-500 animate-pulse' :
                  'bg-rose-500'
                )}></span>
              </span>
            </div>
            <p className="text-muted-foreground text-xs font-semibold truncate max-w-[240px] md:max-w-[400px]">{event?.title}</p>
          </div>
        </div>

        {/* Centered Countdown Timer */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-background border border-border text-xs font-semibold shadow-inner">
          <Clock className={cn("h-4 w-4", secondsLeft < 60 ? "text-rose-500 animate-pulse" : "text-primary")} />
          <span className="text-foreground">
            Thời gian còn lại: <span className={cn("font-bold tabular-nums", secondsLeft < 60 ? "text-rose-500" : "text-primary")}>{formatCountdown(secondsLeft)}</span>
          </span>
        </div>

        {/* Right actions (Theme Toggle and brand name) */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all shrink-0"
            title="Đổi giao diện Sáng/Tối"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-indigo-400" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <div className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            TicketRush Premium
          </div>
        </div>
      </header>

      {/* Main Content Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 w-full overflow-visible lg:overflow-hidden bg-background">
        
        {/* Left Side: Drag-to-pan Canvas */}
        <div className="flex-1 relative overflow-hidden flex flex-col min-h-[500px] lg:h-full bg-seat-canvas border-r border-border shrink-0">
          <div 
            ref={canvasWrapperRef}
            className="flex-1 overflow-auto select-none custom-scrollbar cursor-grab active:cursor-grabbing p-4 md:p-6 relative flex"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
          >
            {/* Viewport coordinate cushion */}
            <div 
              className="relative origin-top-left transition-transform duration-100 ease-out m-auto shrink-0"
              style={{
                width: `${CANVAS_WIDTH * zoom}px`,
                height: `${CANVAS_HEIGHT * zoom}px`,
              }}
            >
              <div 
                className="absolute top-0 left-0 w-[1400px] h-[1000px] origin-top-left"
                style={{
                  transform: `scale(${zoom})`,
                }}
              >
                {/* Stage */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-1/3 flex flex-col items-center pointer-events-none z-10">
                  <div 
                    className="w-full h-3 rounded-b-[30px] shadow-lg border-b-2"
                    style={{
                      borderColor: 'var(--seat-stage-border)',
                      background: 'var(--seat-stage-bg)',
                    }}
                  />
                  <span 
                    className="mt-2 text-[9px] font-black tracking-[0.5em] uppercase"
                    style={{
                      color: 'var(--seat-stage-text)',
                    }}
                  >
                    SÂN KHẤU / STAGE
                  </span>
                </div>

                {/* Render Zones & Seats */}
                {zonesLayouts.map(({ zone, color, shapeLayout, gridRows, gridLayout, standingInfo }, idx) => {
                  const pos = getZonePos(zone, idx, zonesLayouts.length);
                  
                  // Coordinate calculation
                  const leftPx = 100 + (pos.x / 100) * 1200;
                  const topPx = (pos.y / 100) * CANVAS_HEIGHT;

                  // Special Case: Standing Block (Render as single card)
                  if (standingInfo) {
                    const isAllSold = standingInfo.available === 0;
                    
                    const handleStandingClick = () => {
                      if (isAllSold) return;
                      // Logic: Pick first available seat in this standing zone
                      const firstAvail = standingInfo.seats.find(s => s.status === 'AVAILABLE' && !selected.has(s.seat_id));
                      if (firstAvail) {
                        const seatForSelect = {
                          ...firstAvail,
                          lockedByMe: false,
                          label: `Vé đứng - ${firstAvail.seat_number}`,
                          zone_id: zone.zone_id,
                          zone_name: zone.name,
                          price: zone.price,
                        };
                        toggleSelectedSeatId(firstAvail.seat_id);
                        toggleSeat(seatForSelect);
                      }
                    };

                    return (
                      <div
                        key={`zone-wrapper-${zone.zone_id}`}
                        className="absolute group/zone transition-all duration-300 hover:z-20"
                        style={{
                          left: `${leftPx}px`,
                          top: `${topPx}px`,
                          transform: 'translateX(-50%)',
                          zIndex: 10,
                        }}
                      >
                         <div 
                            className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md select-none pointer-events-none z-30"
                            style={{
                              backgroundColor: color,
                              color: '#ffffff',
                            }}
                          >
                            {zone.name}
                          </div>
                        <button
                          type="button"
                          onClick={handleStandingClick}
                          disabled={isAllSold}
                          className={cn(
                            "w-[240px] h-[120px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all shadow-sm",
                            isAllSold ? "bg-muted/10 border-muted-foreground/30 cursor-not-allowed opacity-60" : 
                            "hover:scale-[1.03] hover:shadow-xl cursor-pointer active:scale-95"
                          )}
                          style={{
                            borderColor: isAllSold ? undefined : `${color}80`,
                            backgroundColor: isAllSold ? undefined : `${color}10`,
                          }}
                        >
                          <Ticket className={cn("h-6 w-6 mb-1", isAllSold ? "text-muted-foreground" : "")} style={{ color: isAllSold ? undefined : color }} />
                          <div className="flex flex-col items-center leading-none">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Khu vực đứng</span>
                            <span className="mt-1 text-lg font-black tracking-tight" style={{ color: isAllSold ? undefined : color }}>
                              {isAllSold ? 'HẾT VÉ' : `${standingInfo.available} Chỗ trống`}
                            </span>
                          </div>
                          <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-bold uppercase">
                            Tổng {standingInfo.total} vé
                          </div>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`zone-wrapper-${zone.zone_id}`}
                      className="absolute group/zone transition-all duration-300 hover:scale-[1.01] hover:z-20"
                      style={{
                        left: `${leftPx}px`,
                        top: `${topPx}px`,
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                      }}
                    >
                      {shapeLayout ? (
                        <div 
                          className="relative border border-dashed rounded-2xl transition-colors duration-300"
                          style={{
                            borderColor: `${color}4D`,
                            backgroundColor: `${color}05`,
                            width: `${shapeLayout.result.suggestedWidth}px`,
                            height: `${shapeLayout.result.suggestedHeight}px`,
                          }}
                        >
                          {/* Zone Label - Positioned ABOVE to avoid overlapping absolute seats */}
                          <div 
                            className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md select-none pointer-events-none z-30"
                            style={{
                              backgroundColor: color,
                              color: '#ffffff',
                            }}
                          >
                            {zone.name}
                          </div>

                          {shapeLayout.shapeType === 'banquet' &&
                            (shapeLayout.result.tables || []).map((table, tIdx) => (
                              <div
                                key={`table-${zone.zone_id}-${tIdx}`}
                                className="absolute rounded-full border shadow-inner"
                                style={{
                                  left: table.cx,
                                  top: table.cy,
                                  width: table.radius * 2,
                                  height: table.radius * 2,
                                  transform: 'translate(-50%, -50%)',
                                  backgroundColor: 'var(--seat-banquet-table-bg)',
                                  borderColor: 'var(--seat-banquet-table-border)',
                                }}
                              />
                            ))}

                          {(zone?.seats ?? []).map((s) => {
                            const seatId = s.seat_id || s.seatId;
                            const key = seatCoordKey(s.row_label, s.seat_number);
                            const coord = key ? shapeLayout.coordById.get(key) : null;
                            if (!coord) return null;

                            const lockedByMe = s.status === 'LOCKED' && s.locked_by_user_id && user?.user_id && s.locked_by_user_id === user.user_id;

                            const seatForSelect = {
                              ...s,
                              lockedByMe,
                              seat_id: seatId,
                              label: seatLabel(s),
                              zone_id: zone.zone_id,
                              zone_name: zone.name,
                              price: zone.price,
                            };

                            const seatState = s.status === 'SOLD'
                              ? 'sold'
                              : s.status === 'LOCKED' && !lockedByMe
                                ? 'locked'
                                : selected.has(seatId)
                                  ? 'selected'
                                  : 'available';

                            const seatTitleState = s.status === 'SOLD'
                              ? 'sold'
                              : s.status === 'LOCKED' && !lockedByMe
                                ? 'locked'
                                : 'available';

                            const handleClick = () => {
                              if (!seatId) return;
                              toggleSelectedSeatId(seatId);
                              toggleSeat(seatForSelect);
                            };

                            return (
                              <button
                                type="button"
                                key={seatId}
                                data-seat-id={seatId}
                                title={`${seatForSelect.label} • ${seatTitleState.toUpperCase()}`}
                                onClick={(seatState === 'sold' || seatState === 'locked') && !selected.has(seatId) ? undefined : handleClick}
                                className={cn(
                                  'absolute rounded flex items-center justify-center transition-transform duration-100 hover:scale-125 hover:z-30 outline-none focus:outline-none bg-transparent border-0 p-0 cursor-pointer',
                                  seatState === 'selected' && 'bg-seat-selected',
                                  seatState === 'locked' && 'bg-seat-locked',
                                  seatState === 'sold' && 'bg-seat-sold',
                                  (seatState === 'sold' || seatState === 'locked') && !selected.has(seatId) ? 'opacity-70' : 'hover:bg-white/5'
                                )}
                                style={{
                                  left: coord.x,
                                  top: coord.y,
                                  transform: 'translate(-50%, -50%)',
                                  width: 22,
                                  height: 24,
                                }}
                              >
                                <SeatIcon
                                  state={seatState}
                                  rotation={coord.rotation}
                                  color={color}
                                  seatLabel={seatForSelect.label}
                                />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div 
                          className="relative p-6 border border-dashed rounded-2xl flex flex-col items-center gap-3 transition-colors duration-300 w-max"
                          style={{
                            borderColor: `${color}4D`,
                            backgroundColor: `${color}05`,
                          }}
                        >
                          <div 
                            className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md select-none pointer-events-none z-30"
                            style={{
                              backgroundColor: color,
                              color: '#ffffff',
                            }}
                          >
                            {zone.name}
                          </div>

                          {gridRows.map((row) => (
                            <div key={`grid-row-${zone.zone_id}-${row.rowLabel}`} className="flex items-center gap-3">
                              <div 
                                className="w-6 h-6 flex items-center justify-center rounded-full text-[9px] font-black border"
                                style={{
                                  backgroundColor: 'var(--seat-grid-label-bg)',
                                  borderColor: 'var(--seat-grid-label-border)',
                                  color: 'var(--seat-grid-label-text)',
                                }}
                              >
                                {row.rowLabel}
                              </div>
                              <div
                                className="grid gap-1.5"
                                style={{ gridTemplateColumns: `repeat(${row.cols}, minmax(0, 1fr))` }}
                              >
                                {row.cells.map((s, idx) => {
                                  if (!s) {
                                    return <div key={`${row.rowLabel}-empty-${idx}`} className="h-7 w-7 rounded bg-muted/20 border border-transparent" />;
                                  }

                                  const lockedByMe = s.status === 'LOCKED' && s.locked_by_user_id && user?.user_id && s.locked_by_user_id === user.user_id;
                                  const seatId = s.seat_id || s.seatId;
                                  const seatForSelect = {
                                    ...s,
                                    lockedByMe,
                                    seat_id: seatId,
                                    label: seatLabel(s),
                                    zone_id: zone.zone_id,
                                    zone_name: zone.name,
                                    price: zone.price
                                  };

                                  const seatState = s.status === 'SOLD'
                                    ? 'sold'
                                    : s.status === 'LOCKED' && !lockedByMe
                                      ? 'locked'
                                      : selected.has(seatId)
                                        ? 'selected'
                                        : 'available';

                                  const seatTitleState = s.status === 'SOLD'
                                    ? 'sold'
                                    : s.status === 'LOCKED' && !lockedByMe
                                      ? 'locked'
                                      : 'available';

                                  const handleClick = () => {
                                    if (!seatId) return;
                                    toggleSelectedSeatId(seatId);
                                    toggleSeat(seatForSelect);
                                  };

                                  return (
                                    <button
                                      type="button"
                                      key={seatId}
                                      data-seat-id={seatId}
                                      title={`${seatForSelect.label} • ${seatTitleState.toUpperCase()}`}
                                      onClick={(seatState === 'sold' || seatState === 'locked') && !selected.has(seatId) ? undefined : handleClick}
                                      className={cn(
                                        'h-7 w-7 rounded flex items-center justify-center transition-transform duration-100 hover:scale-125 hover:z-30 outline-none focus:outline-none bg-transparent border-0 p-0 cursor-pointer',
                                        seatState === 'selected' && 'bg-seat-selected',
                                        seatState === 'locked' && 'bg-seat-locked',
                                        seatState === 'sold' && 'bg-seat-sold',
                                        (seatState === 'sold' || seatState === 'locked') && !selected.has(seatId) ? 'opacity-70' : 'hover:bg-white/5'
                                      )}
                                    >
                                      <SeatIcon
                                        state={seatState}
                                        rotation={0}
                                        color={color}
                                        seatLabel={seatForSelect.label}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Floating Zoom Controls */}
          <div 
            className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 backdrop-blur bg-seat-zoom-bg border border-seat-zoom-border p-1.5 rounded-xl shadow-lg"
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg text-seat-zoom-text hover:bg-seat-zoom-hover" 
              onClick={handleZoomOut} 
              disabled={zoom <= 0.5}
              title="Thu nhỏ"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-[11px] font-bold min-w-[36px] text-center text-seat-zoom-text">
              {Math.round(zoom * 100)}%
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg text-seat-zoom-text hover:bg-seat-zoom-hover" 
              onClick={handleZoomIn} 
              disabled={zoom >= 2.0}
              title="Phóng to"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <div className="w-[1px] h-4 mx-1 bg-seat-zoom-border" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg text-seat-zoom-text hover:bg-seat-zoom-hover" 
              onClick={handleZoomReset}
              title="Về kích thước chuẩn"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right Side: Sidebar */}
        <aside className="w-full lg:w-[380px] bg-card border-l border-border flex flex-col shrink-0 overflow-visible lg:overflow-hidden">
          {/* Event & Location (Fixed top) */}
          <div className="p-5 border-b border-border shrink-0 space-y-4 bg-card/60">
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-foreground tracking-tight leading-tight line-clamp-2">{event?.title}</h2>
              <div className="space-y-1 text-xs text-muted-foreground font-semibold">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{formattedTime} - {formattedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{event?.location || 'Đang cập nhật'}</span>
                </div>
              </div>
            </div>

            {/* Event Zones & Prices */}
            <div className="space-y-2 pt-2.5 border-t border-border">
              <h3 className="text-[10px] font-black text-muted-foreground/80 uppercase tracking-wider">Khu vực & Giá vé</h3>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 max-h-[90px] overflow-y-auto pr-1 custom-scrollbar">
                {zones.map((z) => (
                  <div key={z.zone_id} className="flex items-center gap-2 text-xs">
                    <span 
                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm border border-black/10" 
                      style={{ backgroundColor: z?.layout_meta?.color || z?.color || '#3b82f6' }} 
                    />
                    <div className="truncate min-w-0">
                      <div className="font-bold text-foreground truncate">{z.name}</div>
                      <div className="text-muted-foreground text-[10px]">{formatVND(z.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cart & Legends (Scrollable center) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            {/* Status Legend */}
            <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-2.5">
              <h3 className="text-[10px] font-black text-muted-foreground/80 uppercase tracking-wider">Chú thích trạng thái</h3>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span 
                    className="h-3 w-3 rounded border shrink-0 animate-in fade-in duration-200" 
                    style={{ 
                      backgroundColor: 'var(--seat-available-fill)', 
                      borderColor: 'var(--seat-canvas-border)' 
                    }}
                  />
                  <span className="text-muted-foreground text-[10px] font-semibold">Trống (Màu khu)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-3 w-3 rounded bg-[#22c55e] shrink-0" />
                  <span className="text-muted-foreground text-[10px] font-semibold">Đang chọn</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span 
                    className="h-3 w-3 rounded shrink-0" 
                    style={{ backgroundColor: 'var(--seat-locked-fill)' }}
                  />
                  <span className="text-muted-foreground text-[10px] font-semibold">Đang giữ</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span 
                    className="h-3 w-3 rounded border shrink-0" 
                    style={{ 
                      backgroundColor: 'var(--seat-sold-fill)', 
                      borderColor: 'var(--seat-sold-stroke)' === 'none' ? 'transparent' : 'var(--seat-sold-stroke)'
                    }}
                  />
                  <span className="text-muted-foreground text-[10px] font-semibold">Đã bán</span>
                </div>
              </div>
            </div>

            {/* Selected Seats Cart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Ghế đã chọn ({selectedSeats.length})</h3>
                </div>
                {selectedSeats.length > 0 && (
                  <button 
                    onClick={() => clearSelection()}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 transition-all"
                  >
                    <Trash2 className="h-3 w-3 shrink-0" />
                    Xóa tất cả
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {selectedSeats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border border-dashed border-border rounded-xl bg-muted/10">
                    <Armchair className="h-7 w-7 opacity-20 text-muted-foreground mb-2" />
                    <p className="text-[10px] font-semibold px-4 leading-normal text-muted-foreground">Hãy chọn ghế trống trên sơ đồ phòng vé để đặt vé.</p>
                  </div>
                ) : (
                  selectedSeats.map((s) => (
                    <div
                      key={s.seat_id || s.seatId}
                      className="group relative flex items-center justify-between rounded-xl border border-border bg-muted/30 p-2.5 transition-all hover:bg-muted/50 hover:border-accent"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                          {s.row_label}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase tracking-tight text-foreground">{s.label || seatLabel(s)}</div>
                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[120px]">{s.zone_name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-black text-primary">{formatVND(s.price)}</div>
                        <button 
                          onClick={() => toggleSeat(s)}
                          className="rounded-full p-1 text-muted-foreground hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                          title="Xóa ghế này"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Totals & Actions (Fixed bottom) */}
          <div className="p-5 border-t border-border bg-card/60 shrink-0 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tổng tiền</span>
              <span className="text-xl font-black text-primary tracking-tight">{formatVND(total)}</span>
            </div>
            
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 font-semibold animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              className="w-full h-11 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              size="lg"
              disabled={selectedSeats.length === 0 || submitting}
              onClick={handleCreateOrder}
            >
              {submitting ? (
                <>
                  <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Đang xử lý...
                </>
              ) : (
                'Tiếp tục thanh toán'
              )}
            </Button>
            
            <p className="text-[9px] text-center text-muted-foreground/60 font-semibold uppercase tracking-wider">
              Lưu ý: Ghế được khóa tạm thời trong 10 phút sau khi bấm tiếp tục.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
