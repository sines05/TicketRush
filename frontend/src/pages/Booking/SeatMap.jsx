import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Seat from '../../components/booking/Seat.jsx';
import Button from '../../components/common/Button.jsx';
import Loading from '../../components/common/Loading.jsx';
import { BookingContext } from '../../context/BookingContext.jsx';
import eventService from '../../services/eventService.js';
import { formatVND } from '../../utils/formatters.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import orderService from '../../services/orderService.js';

function seatLabel(seat) {
  return `${seat.row_label}-${seat.seat_number}`;
}

export default function SeatMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedSeats, toggleSeat, isSelected, clearSelection, startBooking } =
    useContext(BookingContext);
  const { user } = useAuth();

  const eventId = useMemo(() => searchParams.get('eventId') || '', [searchParams]);
  const queueToken = useMemo(() => searchParams.get('queueToken') || '', [searchParams]);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [activeZoneId, setActiveZoneId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // WebSocket real-time seat updates — use callback to bypass React 18 batching
  const { status: wsStatus, setOnMessage } = useWebSocket(
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
    { enabled: !!eventId }
  );

  // Register the WebSocket message handler — fires immediately for EACH message
  useEffect(() => {
    setOnMessage((data) => {
      try {
        const msg = JSON.parse(data);
        if (!msg.type || !msg.seat_id) return;

        setSeatMap((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            zones: prev.zones.map((zone) => ({
              ...zone,
              seats: zone.seats.map((seat) => {
                if (seat.seat_id !== msg.seat_id) return seat;
                switch (msg.type) {
                  case 'SEAT_LOCKED':
                    return { ...seat, status: 'LOCKED' };
                  case 'SEAT_SOLD':
                    return { ...seat, status: 'SOLD' };
                  case 'SEAT_RELEASED':
                    return { ...seat, status: 'AVAILABLE', locked_by_user_id: null };
                  default:
                    return seat;
                }
              })
            }))
          };
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

  function getZonePos(zone, index, total) {
    const meta = zone?.layout_meta || {};
    const x = Number(meta?.pos_x);
    const y = Number(meta?.pos_y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    }

    const t = total > 1 ? index / (total - 1) : 0.5;
    return { x: 15 + t * 70, y: 35 + (index % 2) * 25 };
  }

  const activeZone = useMemo(() => {
    return zones.find((z) => z.zone_id === activeZoneId) || zones[0] || null;
  }, [zones, activeZoneId]);

  const activeZoneLayout = useMemo(() => {
    const meta = activeZone?.layout_meta || {};
    const align = meta?.align === 'right' || meta?.align === 'left' || meta?.align === 'center' ? meta.align : 'left';
    const style = meta?.style === 'center_aisle' || meta?.style === 'three_blocks' || meta?.style === 'plain' ? meta.style : 'plain';
    const aisleSize = Math.max(1, Math.min(6, Number(meta?.aisle_size) || 2));
    return { align, style, aisleSize };
  }, [activeZone]);

  function buildRowCells(seatsInRow, maxSeatCount) {
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
  }

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
  }, [activeZone, activeZoneLayout]);

  const total = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  }, [selectedSeats]);

  async function handleCreateOrder() {
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
  }

  if (loading) return <Loading title="Đang tải sơ đồ ghế..." />;

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-danger/10 p-5">
        <div className="text-sm font-semibold">Không tải được sơ đồ ghế</div>
        <div className="mt-2 text-sm text-muted">{error}</div>
        <div className="mt-4 flex gap-2">
          <Link to="/">
            <Button variant="secondary">Trang chủ</Button>
          </Link>
          <Button onClick={() => navigate(-1)}>Quay lại</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-text/10 bg-surface p-5 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Chọn ghế</div>
            <div className="mt-1 text-xs text-muted">{event?.title}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${
                wsStatus === 'CONNECTED' ? 'bg-success' :
                wsStatus === 'CONNECTING' ? 'bg-warning animate-pulse' :
                'bg-danger'
              }`} />
              <span className="text-xs text-muted">
                {wsStatus === 'CONNECTED' ? 'Live' : wsStatus === 'CONNECTING' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => clearSelection()}>
              Bỏ chọn
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/')}> 
              Thoát
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-text/10 bg-bg/30 p-3">
          <div className="text-xs font-semibold text-muted">Sơ đồ zones</div>
          <div className="mt-3 overflow-hidden rounded-xl border border-text/10 bg-bg/40">
            <div className="relative h-44">
              <div className="absolute left-3 right-3 top-3 flex items-center justify-center">
                <div className="h-2 w-3/5 rounded-full bg-brand-600/40" aria-hidden="true" />
              </div>

              {zones.map((z, idx) => {
                const pos = getZonePos(z, idx, zones.length);
                const active = z.zone_id === activeZoneId;
                return (
                  <button
                    key={`zone-map-${z.zone_id}`}
                    type="button"
                    onClick={() => setActiveZoneId(z.zone_id)}
                    className={`absolute w-32 rounded-xl border px-3 py-2 text-left text-xs transition ${
                      active
                        ? 'border-brand-600/60 bg-brand-600/15 text-text'
                        : 'border-text/10 bg-surface text-muted hover:bg-text/5 hover:text-text'
                    }`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="font-semibold leading-tight">{z.name}</div>
                    <div className="mt-0.5 text-[10px] text-muted">{formatVND(z.price)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {zones.map((z) => (
            <button
              key={z.zone_id}
              type="button"
              onClick={() => setActiveZoneId(z.zone_id)}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                z.zone_id === activeZoneId
                  ? 'border-brand-600/60 bg-brand-600/15 text-text'
                  : 'border-text/10 bg-bg/40 text-muted hover:bg-text/5 hover:text-text'
              }`}
            >
              <div className="font-semibold">{z.name}</div>
              <div className="text-xs">{formatVND(z.price)}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-text/10 bg-bg/30 p-4">
          <div className="mb-3 text-center text-xs text-muted">SÂN KHẤU</div>
          <div
            className="mx-auto h-2 w-3/5 rounded-full bg-brand-600/40"
            aria-hidden="true"
          />

          <div className="mt-6 overflow-auto">
            <div className="space-y-3">
              {zoneRows.map((row) => (
                <div key={row.rowLabel} className="flex items-center gap-3">
                  <div className="w-6 text-xs font-semibold text-muted">{row.rowLabel}</div>
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${row.cols}, minmax(0, 1fr))` }}
                  >
                    {row.cells.map((s, idx) => {
                      if (!s) {
                        return <div key={`${row.rowLabel}-empty-${idx}`} className="h-8 w-8 rounded-md bg-text/5" />;
                      }

                      const lockedByMe = s.status === 'LOCKED' && s.locked_by_user_id && user?.user_id && s.locked_by_user_id === user.user_id;
                      const seatForSelect = {
                        ...s,
                        lockedByMe,
                        seat_id: s.seat_id,
                        label: seatLabel(s),
                        zone_id: activeZone.zone_id,
                        zone_name: activeZone.name,
                        price: activeZone.price
                      };

                      return (
                        <Seat
                          key={s.seat_id}
                          seat={seatForSelect}
                          selected={isSelected(s.seat_id)}
                          onClick={toggleSeat}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted">
            <LegendItem label="Available" className="bg-seat-available" />
            <LegendItem label="Locked" className="bg-seat-locked" />
            <LegendItem label="Sold" className="bg-seat-sold" />
            <LegendItem label="Selected" className="bg-seat-selected" />
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Vé đang chọn</div>
          <div className="text-xs text-muted">{selectedSeats.length} ghế</div>
        </div>

        <div className="mt-4 space-y-3">
          {selectedSeats.length === 0 ? (
            <div className="rounded-xl border border-text/10 bg-bg/40 p-4 text-sm text-muted">
              Chọn ghế ở bên trái để tiếp tục.
            </div>
          ) : (
            selectedSeats.map((s) => (
              <div
                key={s.seat_id || s.seatId}
                className="flex items-center justify-between rounded-xl border border-text/10 bg-bg/40 p-3"
              >
                <div>
                  <div className="text-sm font-semibold">{s.label || seatLabel(s)}</div>
                  <div className="mt-1 text-xs text-muted">{s.zone_name || activeZone?.name}</div>
                </div>
                <div className="text-sm font-semibold">{formatVND(s.price)}</div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 rounded-xl border border-text/10 bg-bg/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Tổng cộng</span>
            <span className="font-semibold">{formatVND(total)}</span>
          </div>
          {error && (
            <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
              {error}
            </div>
          )}
          <div className="mt-3">
            <Button
              className="w-full"
              disabled={selectedSeats.length === 0}
              onClick={handleCreateOrder}
            >
              {submitting ? 'Đang giữ ghế...' : 'Tiếp tục thanh toán'}
            </Button>
          </div>
          <div className="mt-3 text-xs text-muted">
            Theo contract: chỉ giữ ghế sau khi gọi API `POST /orders/lock-seats`.
          </div>
        </div>
      </aside>
    </div>
  );
}

function LegendItem({ label, className }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded ${className}`} />
      <span>{label}</span>
    </div>
  );
}
