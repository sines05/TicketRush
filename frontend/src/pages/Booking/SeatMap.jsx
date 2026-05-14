import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import SeatIcon from '../../components/SeatIcon.tsx';
import { ZoneShapePreview } from '../../components/SeatBuilder/ZoneBlock.tsx';
import {
  generateBanquet,
  generateChevron,
  generateSemiCircle,
  generateTheatreAuditorium,
} from '../../components/SeatBuilder/shapeGenerators.ts';
import { Button } from '../../components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card.jsx';
import Loading from '../../components/common/Loading.jsx';
import { BookingContext } from '../../context/BookingContext.jsx';
import eventService from '../../services/eventService.js';
import queueService from '../../services/queueService.js';
import { formatVND } from '../../utils/formatters.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useCountdown, formatCountdown } from '../../hooks/useCountdown.js';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import orderService from '../../services/orderService.js';
import { ArrowLeft, Trash2, X, AlertCircle, Clock, Map as MapIcon, Armchair, Ticket } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog.jsx";

function seatLabel(seat) {
  return `${seat.row_label}-${seat.seat_number}`;
}

function seatCoordKey(rowLabel, seatNumber) {
  const row = typeof rowLabel === 'string' ? rowLabel : '';
  const n = Number(seatNumber);
  if (!row || !Number.isFinite(n)) return '';
  return `${row}${Math.max(1, Math.floor(n))}`;
}

function getZoneShapeMeta(zone) {
  const meta = zone?.layout_meta || {};
  const rawType = meta?.shape_type || meta?.shapeType || zone?.shape_type || zone?.shapeType;
  const shapeType = rawType === 'semi_circle' ? 'theatre' : typeof rawType === 'string' ? rawType : 'theatre';
  const seatMode = meta?.seat_type === 'standing' || shapeType === 'standing_block' ? 'standing' : 'seated';
  return { shapeType, seatMode };
}

export default function SeatMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedSeats, toggleSeat, clearSelection, startBooking } =
    useContext(BookingContext);
  const { user, token } = useAuth();

  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    const next = new Set();
    for (const s of selectedSeats || []) {
      const id = s?.seat_id || s?.seatId;
      if (id) next.add(id);
    }
    setSelected(next);
  }, [selectedSeats]);

  const eventId = useMemo(() => searchParams.get('eventId') || '', [searchParams]);
  const queueToken = useMemo(() => searchParams.get('queueToken') || '', [searchParams]);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [activeZoneId, setActiveZoneId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [allowedAt, setAllowedAt] = useState(location.state?.allowedAt);

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
    enabled: !!eventId,
    token
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

        setSeatMap((prev) => {
          if (!prev) return prev;
          
          // Optimization: Only update if the target seats are in the current seatMap
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
  }, [setOnMessage]);

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
        setActiveZoneId(sm?.zones?.[0]?.zone_id ?? '');
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Không tải được seat map');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [eventId, startBooking]);

  const zones = seatMap?.zones ?? [];

  const getZonePos = useCallback((zone, index, total) => {
    const meta = zone?.layout_meta || {};
    const x = Number(meta?.pos_x);
    const y = Number(meta?.pos_y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    }

    const t = total > 1 ? index / (total - 1) : 0.5;
    return { x: 15 + t * 70, y: 52 + (index % 2) * 16 };
  }, []);

  const activeZone = useMemo(() => {
    return zones.find((z) => z.zone_id === activeZoneId) || zones[0] || null;
  }, [zones, activeZoneId]);

  const bookedSeats = useMemo(() => {
    const out = new Set();
    const list = activeZone?.seats ?? [];
    for (const s of list) {
      const id = s?.seat_id || s?.seatId;
      if (!id) continue;
      const lockedByMe =
        s.status === 'LOCKED' &&
        s.locked_by_user_id &&
        user?.user_id &&
        s.locked_by_user_id === user.user_id;
      const isUnavailable = s.status !== 'AVAILABLE' && !lockedByMe;
      if (isUnavailable) out.add(id);
    }
    return out;
  }, [activeZone, user]);

  const toggleSelectedSeatId = useCallback((seatId) => {
    if (!seatId) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else next.add(seatId);
      return next;
    });
  }, []);

  const activeZoneLayout = useMemo(() => {
    const meta = activeZone?.layout_meta || {};
    const align = meta?.align === 'right' || meta?.align === 'left' || meta?.align === 'center' ? meta.align : 'left';
    const style = meta?.style === 'center_aisle' || meta?.style === 'three_blocks' || meta?.style === 'plain' ? meta.style : 'plain';
    const aisleSize = Math.max(1, Math.min(6, Number(meta?.aisle_size) || 2));
    return { align, style, aisleSize };
  }, [activeZone]);

  const activeZoneColor = useMemo(() => {
    const metaColor = activeZone?.layout_meta?.color;
    return metaColor || activeZone?.color;
  }, [activeZone]);

  const activeZoneShape = useMemo(() => {
    const meta = activeZone?.layout_meta || {};
    const rawType = meta?.shape_type || meta?.shapeType || activeZone?.shape_type || activeZone?.shapeType;
    const shapeType = typeof rawType === 'string' ? rawType : '';
    const rawParams = meta?.shape_params || meta?.shapeParams;
    const shapeParams = rawParams && typeof rawParams === 'object' ? rawParams : {};
    return { shapeType, shapeParams };
  }, [activeZone]);

  const activeZoneGeneratedLayout = useMemo(() => {
    const zone = activeZone;
    if (!zone) return null;

    const { shapeType, shapeParams } = activeZoneShape;
    if (!shapeType) return null;

    // Standing blocks are currently represented as many "seats" in the API;
    // keep the grid-based rendering for those.
    if (shapeType === 'standing_block') return null;

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

    if (!result) return null;
    const coordById = new Map();
    for (const c of result.seats || []) {
      coordById.set(c.id, c);
    }
    return { shapeType, result, coordById };
  }, [activeZone, activeZoneShape]);

  const buildRowCells = useCallback((seatsInRow, maxSeatCount) => {
    const seats = Array.isArray(seatsInRow) ? seatsInRow : [];
    const seatCount = seats.length;
    const { align, style, aisleSize } = activeZoneLayout;

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
        const order = [1, 0, 2]; // put remainder into center first
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
        cells.push(seats[idx++] || null);
      }
      if (b < blocks.length - 1) {
        for (let i = 0; i < aisleSize; i++) cells.push(null);
      }
    }

    for (let i = 0; i < rightPad; i++) cells.push(null);
    return { cells, cols: totalCols };
  }, [activeZoneLayout]);

  const zoneRows = useMemo(() => {
    const zone = activeZone;
    if (!zone) return [];

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

    return sortedRows.map((r) => {
      const built = buildRowCells(r.seats, maxSeatCount);
      return { rowLabel: r.rowLabel, cells: built.cells, cols: built.cols };
    });
  }, [activeZone, buildRowCells]);

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
      setError(e?.message || 'Không giữ được ghế.');
    } finally {
      setSubmitting(false);
    }
  }, [eventId, selectedSeats, queueToken, navigate]);

  if (loading) return <Loading title="Đang tải sơ đồ ghế..." />;

  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-10 border-destructive/50 bg-destructive/5 glass-surface">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Không tải được sơ đồ ghế
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Quay lại</Button>
          <Button asChild>
            <Link to="/">Về Trang chủ</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Sticky Countdown Timer */}
      <div className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-lg border-b mb-6 -mt-6">
        <div className="container flex items-center justify-center py-3 gap-3">
          <Clock className={cn("h-5 w-5", secondsLeft < 60 ? "text-destructive animate-pulse" : "text-primary")} />
          <span className="text-sm font-medium">
            Bạn có <span className={cn("font-bold tabular-nums", secondsLeft < 60 ? "text-destructive" : "text-primary")}>
              {formatCountdown(secondsLeft)}
            </span> để hoàn tất chọn ghế
          </span>
        </div>
      </div>

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

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Chọn ghế</h1>
            <p className="text-muted-foreground text-sm">{event?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50 px-3 py-1.5 text-xs font-medium">
            <span className={cn("h-2 w-2 rounded-full", 
              wsStatus === 'CONNECTED' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
              wsStatus === 'CONNECTING' ? 'bg-amber-500 animate-pulse' :
              'bg-destructive'
            )} />
            {wsStatus === 'CONNECTED' ? 'Trực tiếp' : wsStatus === 'CONNECTING' ? 'Đang kết nối...' : 'Ngoại tuyến'}
          </div>
          <Button variant="outline" size="sm" onClick={() => clearSelection()} className="gap-2 rounded-full border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            Bỏ chọn
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-surface overflow-hidden border-none shadow-2xl">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Sơ đồ khu vực</CardTitle>
              </div>
              <CardDescription>Chọn một khu vực để xem chi tiết chỗ ngồi</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative h-72 w-full rounded-2xl border bg-muted/20 overflow-hidden shadow-inner px-3 pt-3 pb-3">
                <div className="absolute left-1/2 top-4 -translate-x-1/2 w-1/2 h-2 rounded-full bg-primary/20 blur-[1px]" />
                <div className="absolute left-1/2 top-8 -translate-x-1/2 text-[10px] font-black text-primary/40 tracking-[0.5em] uppercase">SÂN KHẤU</div>
                <div className="absolute left-0 right-0 top-14 bottom-3">
                  {zones.map((z, idx) => {
                    const pos = getZonePos(z, idx, zones.length);
                    const active = z.zone_id === activeZoneId;
                    const zoneShape = getZoneShapeMeta(z);
                    const zoneColor = z?.layout_meta?.color || z?.color || '#60a5fa';
                    return (
                      <button
                        key={`zone-map-${z.zone_id}`}
                        type="button"
                        onClick={() => setActiveZoneId(z.zone_id)}
                        className={cn(
                          "absolute h-28 w-40 p-0 transition-transform duration-200 origin-center",
                          active ? "scale-110 z-20" : "hover:scale-105 z-10"
                        )}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                        aria-label={z.name}
                      >
                        <div className="h-full w-full flex items-center justify-center">
                          <ZoneShapePreview
                            color={zoneColor}
                            shapeType={zoneShape.shapeType}
                            seatMode={zoneShape.seatMode}
                            className="h-full w-full p-1.5"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {zones.map((z) => (
                  <Button
                    key={z.zone_id}
                    variant={z.zone_id === activeZoneId ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveZoneId(z.zone_id)}
                    className={cn(
                      "flex-col h-auto py-2.5 px-5 items-start rounded-xl transition-all",
                      z.zone_id === activeZoneId ? "shadow-lg shadow-primary/20 scale-105" : "hover:bg-primary/5"
                    )}
                  >
                    <span className="text-xs font-black uppercase tracking-tight">{z.name}</span>
                    <span className="text-[10px] opacity-70 font-medium">{formatVND(z.price)}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface border-none shadow-2xl">
            <CardHeader className="pb-0 bg-primary/5 border-b border-primary/10 mb-6">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Armchair className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Chi tiết: {activeZone?.name}</CardTitle>
                </div>
                <div className="px-3 py-1 rounded-full bg-primary/10 text-sm font-bold text-primary border border-primary/20">
                  {formatVND(activeZone?.price)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-12 flex flex-col items-center relative">
                <div className="w-3/4 h-3 rounded-b-[40px] bg-gradient-to-b from-primary/20 to-primary/40 border-x border-b border-primary/30 shadow-[0_10px_20px_-10px_rgba(var(--tr-primary),0.3)]" />
                <div className="mt-3 text-[11px] font-black text-primary/60 tracking-[0.4em] uppercase">SÂN KHẤU</div>
              </div>

              <div className="overflow-auto pb-8 px-2">
                {activeZoneGeneratedLayout ? (
                  <div className="flex min-w-full justify-center">
                    <div className="min-w-max px-4">
                      <div
                        className="relative"
                        style={{
                          width: Math.max(1, activeZoneGeneratedLayout.result.suggestedWidth || 1),
                          height: Math.max(1, activeZoneGeneratedLayout.result.suggestedHeight || 1),
                        }}
                      >
                        {activeZoneGeneratedLayout.shapeType === 'banquet' &&
                          (activeZoneGeneratedLayout.result.tables || []).map((table, index) => (
                            <div
                              key={`table-${index}`}
                              className="absolute rounded-full border border-border/70 bg-muted/30 shadow-inner"
                              style={{
                                left: table.cx,
                                top: table.cy,
                                width: table.radius * 2,
                                height: table.radius * 2,
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                          ))}

                        {(activeZone?.seats ?? []).map((s) => {
                          const seatId = s.seat_id || s.seatId;
                          const key = seatCoordKey(s.row_label, s.seat_number);
                          const coord = key ? activeZoneGeneratedLayout.coordById.get(key) : null;
                          if (!coord) return null;

                          const lockedByMe =
                            s.status === 'LOCKED' &&
                            s.locked_by_user_id &&
                            user?.user_id &&
                            s.locked_by_user_id === user.user_id;

                          const seatForSelect = {
                            ...s,
                            lockedByMe,
                            seat_id: s.seat_id,
                            label: seatLabel(s),
                            zone_id: activeZone.zone_id,
                            zone_name: activeZone.name,
                            price: activeZone.price,
                          };

                          const seatState = selected.has(seatId)
                            ? 'selected'
                            : bookedSeats.has(seatId)
                              ? 'unavailable'
                              : 'available';

                          const handleClick = () => {
                            if (!seatId) return;
                            toggleSelectedSeatId(seatId);
                            toggleSeat(seatForSelect);
                          };

                          return (
                            <div
                              key={seatId}
                              className={cn(
                                'absolute rounded-md flex items-center justify-center',
                                seatState === 'unavailable' ? 'opacity-70' : 'hover:bg-primary/5'
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
                                color={activeZoneColor}
                                seatLabel={seatForSelect.label}
                                onClick={seatState === 'unavailable' ? undefined : handleClick}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-w-full justify-center">
                    <div className="min-w-max space-y-4 px-4">
                      {zoneRows.map((row) => (
                        <div key={row.rowLabel} className="flex items-center gap-6">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 text-[10px] font-black text-muted-foreground border border-border/50">
                            {row.rowLabel}
                          </div>
                          <div
                            className="grid gap-2.5"
                            style={{ gridTemplateColumns: `repeat(${row.cols}, minmax(0, 1fr))` }}
                          >
                            {row.cells.map((s, idx) => {
                              if (!s) {
                                return <div key={`${row.rowLabel}-empty-${idx}`} className="h-8 w-8 rounded-md bg-muted/10" />;
                              }

                              const lockedByMe = s.status === 'LOCKED' && s.locked_by_user_id && user?.user_id && s.locked_by_user_id === user.user_id;
                              const seatId = s.seat_id || s.seatId;
                              const seatForSelect = {
                                ...s,
                                lockedByMe,
                                seat_id: s.seat_id,
                                label: seatLabel(s),
                                zone_id: activeZone.zone_id,
                                zone_name: activeZone.name,
                                price: activeZone.price
                              };

                              const seatState = selected.has(seatId)
                                ? 'selected'
                                : bookedSeats.has(seatId)
                                  ? 'unavailable'
                                  : 'available';

                              const handleClick = () => {
                                if (!seatId) return;
                                toggleSelectedSeatId(seatId);
                                toggleSeat(seatForSelect);
                              };

                              return (
                                <div
                                  key={seatId}
                                  className={cn(
                                    'h-8 w-8 rounded-md flex items-center justify-center',
                                    seatState === 'unavailable' ? 'opacity-70' : 'hover:bg-primary/5'
                                  )}
                                >
                                  <SeatIcon
                                    state={seatState}
                                    rotation={0}
                                    color={activeZoneColor}
                                    seatLabel={seatForSelect.label}
                                    onClick={seatState === 'unavailable' ? undefined : handleClick}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-8 border-t border-border/50 pt-8">
                <LegendItem label="Trống" colorClass="bg-emerald-500" />
                <LegendItem label="Đang giữ" colorClass="bg-slate-300" />
                <LegendItem label="Đã bán" colorClass="bg-muted/30" />
                <LegendItem label="Đang chọn" colorClass="bg-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 glass-surface border-none shadow-2xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Vé đang chọn</CardTitle>
                </div>
                <div className="rounded-full bg-primary text-primary-foreground px-3 py-0.5 text-xs font-black">
                  {selectedSeats.length}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="max-h-[350px] overflow-auto pr-2 -mr-2 space-y-3 custom-scrollbar">
                {selectedSeats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground/60">
                    <div className="mb-4 p-4 rounded-full bg-muted/30">
                      <Armchair className="h-10 w-10 opacity-20" />
                    </div>
                    <p className="text-sm font-medium">Vui lòng chọn ghế trên sơ đồ để tiếp tục.</p>
                  </div>
                ) : (
                  selectedSeats.map((s) => (
                    <div
                      key={s.seat_id || s.seatId}
                      className="group relative flex items-center justify-between rounded-xl border border-border/50 p-4 transition-all hover:bg-primary/5 hover:border-primary/20 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                          {s.row_label}
                        </div>
                        <div>
                          <div className="text-sm font-black uppercase tracking-tight">{s.label || seatLabel(s)}</div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{s.zone_name || activeZone?.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-black text-primary">{formatVND(s.price)}</div>
                        <button 
                          onClick={() => toggleSeat(s)}
                          className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border/50 pt-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tổng cộng</span>
                  <span className="text-2xl font-black text-primary tracking-tight">{formatVND(total)}</span>
                </div>
                
                {error && (
                  <div className="mb-6 flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  className="w-full h-12 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  size="lg"
                  disabled={selectedSeats.length === 0 || submitting}
                  onClick={handleCreateOrder}
                >
                  {submitting ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Tiếp tục thanh toán'
                  )}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t border-border/50 py-4">
              <p className="text-[10px] text-center w-full text-muted-foreground font-bold uppercase tracking-tighter opacity-60">
                Ghế sẽ được giữ trong 10 phút sau khi bạn nhấn tiếp tục.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ label, colorClass }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("h-4 w-4 rounded-md shadow-sm border border-black/5", colorClass)} />
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{label}</span>
    </div>
  );
}
