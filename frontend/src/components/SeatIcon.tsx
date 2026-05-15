import React from 'react';

export interface SeatIconProps {
  size?: number;
  state: 'available' | 'selected' | 'locked' | 'sold' | 'unavailable' | 'hovered';
  rotation?: number;
  color?: string;
  seatLabel?: string;
  onClick?: () => void;
  isAdmin?: boolean;
}

type Rgb = { r: number; g: number; b: number };

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHexColor(input: string): Rgb | null {
  const raw = input.trim();
  const hex = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]{3}$/.test(hex) && !/^[0-9a-fA-F]{6}$/.test(hex)) return null;

  const full =
    hex.length === 3
      ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
      : hex;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);

  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
  return { r, g, b };
}

function toHex({ r, g, b }: Rgb) {
  const rr = clampByte(r).toString(16).padStart(2, '0');
  const gg = clampByte(g).toString(16).padStart(2, '0');
  const bb = clampByte(b).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

function lightenHexColor(hexColor: string, amount: number) {
  const rgb = parseHexColor(hexColor);
  if (!rgb) return hexColor;

  const t = Math.max(0, Math.min(1, amount));
  return toHex({
    r: rgb.r + (255 - rgb.r) * t,
    g: rgb.g + (255 - rgb.g) * t,
    b: rgb.b + (255 - rgb.b) * t,
  });
}

function getFillColor(state: SeatIconProps['state'], color?: string) {
  void color;
  const baseSeatColor = '#22c55e';

  if (state === 'selected') return '#f59e0b';
  if (state === 'locked') return '#ec4899';
  if (state === 'sold') return '#ef4444';
  if (state === 'unavailable') return '#ec4899';
  if (state === 'hovered') return lightenHexColor(baseSeatColor, 0.15);
  return baseSeatColor;
}

export default function SeatIcon({
  size = 18,
  state,
  rotation = 0,
  color,
  seatLabel,
  onClick,
  isAdmin,
}: SeatIconProps) {
  const width = size;
  const height = (size * 20) / 18;

  const fill = getFillColor(state, color);
  const clickable = Boolean(onClick) && !isAdmin;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 18 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onClick={clickable ? onClick : undefined}
      style={{
        display: 'block',
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      {seatLabel ? <title>{seatLabel}</title> : null}

      <g transform={`rotate(${rotation}, 9, 10)`}>
        {/* seat base */}
        <rect x="1" y="6" width="16" height="12" rx="2" fill={fill} />
        {/* backrest */}
        <rect x="1" y="1" width="16" height="6" rx="3" fill={fill} />
      </g>
    </svg>
  );
}
