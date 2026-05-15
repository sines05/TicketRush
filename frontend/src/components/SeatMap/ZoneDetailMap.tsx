import React, { useState, useMemo } from 'react';

interface Seat {
  seat_id: string;
  id?: string;
  row_label?: string;
  seat_number?: number;
  status: 'AVAILABLE' | 'LOCKED' | 'SOLD';
  locked_by_user_id?: string;
}

interface Zone {
  zone_id: string;
  id?: string;
  name?: string;
  zone_name?: string;
  price: number;
  capacity?: number;
  shape_type?: string;
  shapeType?: string;
}

interface SeatCoord extends Seat {
  x: number;
  y: number;
  rotation?: number;
}

interface ZoneDetailMapProps {
  zone: Zone;
  seats: Seat[];
  selectedSeatIds?: string[];
  onSeatClick: (seatId: string) => void;
  className?: string;
}

const SEAT_SIZE = 30;
const SEAT_MARGIN = 8;

const SEAT_COLORS = {
  AVAILABLE: '#22c55e',
  LOCKED: '#ec4899',
  SOLD: '#ef4444',
  SELECTED: '#f59e0b',
};

export const ZoneDetailMap: React.FC<ZoneDetailMapProps> = ({
  zone,
  seats,
  selectedSeatIds = [],
  onSeatClick,
  className = '',
}) => {
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);

  const shapeType = (zone.shapeType ?? zone.shape_type ?? 'theatre').toLowerCase();

  // Calculate seat positions based on shape type
  const seatCoords = useMemo<SeatCoord[]>(() => {
    const coords: SeatCoord[] = [];

    if (shapeType === 'theatre') {
      // Theatre: rectangular grid
      // Group seats by row_label and arrange in grid
      const rowMap = new Map<string, Seat[]>();
      seats.forEach((seat) => {
        const row = seat.row_label || 'A';
        if (!rowMap.has(row)) rowMap.set(row, []);
        rowMap.get(row)!.push(seat);
      });

      let currentY = 0;
      Array.from(rowMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([row, rowSeats]) => {
          rowSeats.sort((a, b) => (a.seat_number || 0) - (b.seat_number || 0));
          rowSeats.forEach((seat, idx) => {
            coords.push({
              ...seat,
              x: idx * (SEAT_SIZE + SEAT_MARGIN),
              y: currentY,
            });
          });
          currentY += SEAT_SIZE + SEAT_MARGIN;
        });
    } else if (shapeType === 'semi-circle' || shapeType === 'semi_circle') {
      // Semi-circle: arrange seats in an arc
      // Assume seats are sorted by seat_number
      const sortedSeats = [...seats].sort(
        (a, b) => (a.seat_number || 0) - (b.seat_number || 0)
      );

      const totalSeats = sortedSeats.length;
      const arcAngle = 160; // degrees of arc
      const radius = Math.max(100, totalSeats * 8);
      const centerX = radius + 50;
      const centerY = 50;
      const startAngle = (180 - arcAngle) / 2; // center the arc

      sortedSeats.forEach((seat, idx) => {
        const angle = startAngle + (idx / (totalSeats - 1 || 1)) * arcAngle;
        const radians = (angle * Math.PI) / 180;
        const x = centerX + radius * Math.cos(radians);
        const y = centerY + radius * Math.sin(radians);

        coords.push({
          ...seat,
          x,
          y,
          rotation: angle - 90,
        });
      });
    } else if (shapeType === 'chevron') {
      // Chevron: V-shape arrangement
      // Split seats into left and right halves, arrange symmetrically
      const sortedSeats = [...seats].sort(
        (a, b) => (a.seat_number || 0) - (b.seat_number || 0)
      );

      const half = Math.ceil(sortedSeats.length / 2);
      const leftSeats = sortedSeats.slice(0, half);
      const rightSeats = sortedSeats.slice(half);

      const peakX = 150;
      const peakY = 50;
      const maxRows = Math.max(leftSeats.length, rightSeats.length);

      // Left side (going down-left)
      leftSeats.forEach((seat, idx) => {
        const offset = idx * (SEAT_SIZE + SEAT_MARGIN);
        coords.push({
          ...seat,
          x: peakX - offset * 0.6,
          y: peakY + offset,
          rotation: -30,
        });
      });

      // Right side (going down-right)
      rightSeats.forEach((seat, idx) => {
        const offset = idx * (SEAT_SIZE + SEAT_MARGIN);
        coords.push({
          ...seat,
          x: peakX + offset * 0.6,
          y: peakY + offset,
          rotation: 30,
        });
      });
    } else if (shapeType === 'banquet') {
      // Banquet: circular arrangement around a table
      const sortedSeats = [...seats].sort(
        (a, b) => (a.seat_number || 0) - (b.seat_number || 0)
      );

      const totalSeats = sortedSeats.length;
      const radius = Math.max(100, totalSeats * 6);
      const centerX = radius + 50;
      const centerY = radius + 50;

      sortedSeats.forEach((seat, idx) => {
        const angle = (idx / totalSeats) * 360;
        const radians = (angle * Math.PI) / 180;
        const x = centerX + radius * Math.cos(radians);
        const y = centerY + radius * Math.sin(radians);

        coords.push({
          ...seat,
          x,
          y,
          rotation: angle,
        });
      });
    } else {
      // Fallback: grid layout
      coords.push(
        ...seats.map((seat, idx) => ({
          ...seat,
          x: (idx % 10) * (SEAT_SIZE + SEAT_MARGIN),
          y: Math.floor(idx / 10) * (SEAT_SIZE + SEAT_MARGIN),
        }))
      );
    }

    return coords;
  }, [seats, shapeType]);

  // Calculate SVG viewBox dimensions
  const bounds = useMemo(() => {
    if (seatCoords.length === 0) {
      return { width: 400, height: 300, maxX: 0, maxY: 0 };
    }

    let maxX = 0,
      maxY = 0;
    seatCoords.forEach((coord) => {
      maxX = Math.max(maxX, coord.x + SEAT_SIZE + SEAT_MARGIN);
      maxY = Math.max(maxY, coord.y + SEAT_SIZE + SEAT_MARGIN);
    });

    return {
      width: Math.max(400, maxX + 40),
      height: Math.max(300, maxY + 40),
      maxX,
      maxY,
    };
  }, [seatCoords]);

  const formatSeatLabel = (seat: Seat) => {
    return `${seat.row_label || ''}${seat.seat_number || ''}`;
  };

  const getStatusColor = (status: string) => {
    return SEAT_COLORS[status as keyof typeof SEAT_COLORS] || SEAT_COLORS.AVAILABLE;
  };

  const isSelected = (seatId: string) => selectedSeatIds.includes(seatId);
  const isDisabled = (status: string) => status === 'SOLD' || status === 'LOCKED';

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: SEAT_COLORS.AVAILABLE }} />
            <span className="text-slate-300">Trống</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: SEAT_COLORS.LOCKED }} />
            <span className="text-slate-300">Đang giữ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: SEAT_COLORS.SOLD }} />
            <span className="text-slate-300">Đã bán</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: SEAT_COLORS.SELECTED }} />
            <span className="text-slate-300">Đang chọn</span>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          Zone: <span className="font-semibold">{zone.name || zone.zone_name}</span> • Shape:{' '}
          <span className="font-semibold">{shapeType}</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="bg-slate-950 rounded-lg border border-slate-700 p-4 overflow-auto shadow-lg">
        <svg
          viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          width={bounds.width}
          height={bounds.height}
          className="mx-auto"
        >
          {/* Optional grid background */}
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width={bounds.width} height={bounds.height} fill="url(#grid)" />

          {/* Central table (banquet only) */}
          {shapeType === 'banquet' && (
            <circle
              cx={bounds.width / 2}
              cy={bounds.height / 2}
              r="40"
              fill="rgba(148,163,184,0.2)"
              stroke="rgba(148,163,184,0.4)"
              strokeWidth="2"
            />
          )}

          {/* Seats */}
          {seatCoords.map((seatCoord) => {
            const isHovered = hoveredSeatId === seatCoord.seat_id;
            const selected = isSelected(seatCoord.seat_id);
            const disabled = isDisabled(seatCoord.status);
            const statusColor = selected ? SEAT_COLORS.SELECTED : getStatusColor(seatCoord.status);

            return (
              <g key={seatCoord.seat_id}>
                {/* Seat rect */}
                <g
                  transform={`translate(${seatCoord.x}, ${seatCoord.y})${
                    seatCoord.rotation ? ` rotate(${seatCoord.rotation})` : ''
                  }`}
                  onClick={() => !disabled && onSeatClick(seatCoord.seat_id)}
                  onMouseEnter={() => setHoveredSeatId(seatCoord.seat_id)}
                  onMouseLeave={() => setHoveredSeatId(null)}
                  className={disabled ? '' : 'cursor-pointer'}
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                >
                  {/* Seat background */}
                  <rect
                    x="0"
                    y="0"
                    width={SEAT_SIZE}
                    height={SEAT_SIZE}
                    rx="4"
                    fill={statusColor}
                    opacity={selected ? 0.9 : disabled ? 0.6 : 0.8}
                    stroke={selected ? '#b45309' : isHovered && !disabled ? '#16a34a' : 'none'}
                    strokeWidth={selected || isHovered ? 2 : 0}
                    className={disabled ? 'opacity-50' : 'transition-all duration-100'}
                  />

                  {/* Seat label */}
                  <text
                    x={SEAT_SIZE / 2}
                    y={SEAT_SIZE / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-bold pointer-events-none select-none"
                    fill={disabled ? '#94A3B8' : '#FFFFFF'}
                    fontSize="10"
                  >
                    {formatSeatLabel(seatCoord)}
                  </text>

                  {/* Selection indicator */}
                  {selected && (
                    <circle
                      cx={SEAT_SIZE / 2}
                      cy={SEAT_SIZE / 2}
                      r={SEAT_SIZE / 2 + 3}
                      fill="none"
                      stroke="#b45309"
                      strokeWidth="2"
                      className="pointer-events-none"
                    />
                  )}
                </g>

                {/* Tooltip on hover */}
                {isHovered && (
                  <g pointerEvents="none">
                    <rect
                      x={seatCoord.x + SEAT_SIZE / 2 - 35}
                      y={seatCoord.y - 30}
                      width="70"
                      height="24"
                      rx="4"
                      fill="rgba(15,23,42,0.95)"
                      stroke="rgba(100,116,139,0.5)"
                      strokeWidth="1"
                    />
                    <text
                      x={seatCoord.x + SEAT_SIZE / 2}
                      y={seatCoord.y - 14}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs font-semibold pointer-events-none"
                      fill="#E2E8F0"
                      fontSize="11"
                    >
                      {formatSeatLabel(seatCoord)}
                    </text>
                    <text
                      x={seatCoord.x + SEAT_SIZE / 2}
                      y={seatCoord.y - 3}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs pointer-events-none"
                      fill="#94A3B8"
                      fontSize="9"
                    >
                      {seatCoord.status}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Info footer */}
      {seats.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-400 px-4 py-2 bg-slate-800/30 rounded-lg">
          <span>{seats.length} total seats</span>
          <span>
            {selectedSeatIds.length > 0 && (
              <>
                <span className="text-amber-400">{selectedSeatIds.length} selected</span>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default ZoneDetailMap;
