export interface SeatCoord {
  x: number;
  y: number;
  rotation: number;
  id: string;
  tableIndex?: number;
}

export type BanquetTable = { cx: number; cy: number; radius: number };

export type BaseGeneratorResult = {
  seats: SeatCoord[];
  suggestedWidth: number;
  suggestedHeight: number;
};

export type BanquetGeneratorResult = BaseGeneratorResult & {
  tables: BanquetTable[];
};

export type StandingBlockGeneratorResult = BaseGeneratorResult & {
  standingArea: { capacity: number };
};

const DEFAULT_SEAT_PITCH = 18;
const DEFAULT_ROW_GAP = 22;
const CURVED_SEAT_PITCH = 30;
const CURVED_ROW_GAP = 34;
const CURVED_PAD = 32;
const CHEVRON_SEAT_PITCH = 30;
const CHEVRON_ROW_GAP = 34;
const CHEVRON_CENTER_AISLE = 36;
const CHEVRON_PAD = 32;

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function clampNumber(value: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function rowLabelFromIndex(index: number) {
  // Excel-like: 0 -> A, 25 -> Z, 26 -> AA
  let n = Math.max(0, Math.floor(index));
  let label = "";
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function seatId(rowIndex: number, seatIndex: number) {
  return `${rowLabelFromIndex(rowIndex)}${Math.max(1, Math.floor(seatIndex) + 1)}`;
}

function boundsFromSeats(seats: SeatCoord[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of seats) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x);
    maxY = Math.max(maxY, s.y);
  }

  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

function normalizeSeats(seats: SeatCoord[], pad: number) {
  if (seats.length === 0) return { seats, dx: 0, dy: 0 };
  const b = boundsFromSeats(seats);
  const dx = pad - b.minX;
  const dy = pad - b.minY;
  if (dx === 0 && dy === 0) return { seats, dx, dy };
  return { seats: seats.map((s) => ({ ...s, x: s.x + dx, y: s.y + dy })), dx, dy };
}

function rotationToFocalUp(seatX: number, seatY: number, focalX: number, focalY: number) {
  // Matches: 0deg when seat is directly below the focal point.
  return toDeg(Math.atan2(seatX - focalX, seatY - focalY));
}

function rotationToPointFormula(seatX: number, seatY: number, centerX: number, centerY: number) {
  // Matches spec: atan2(x - centerX, centerY - y)
  return toDeg(Math.atan2(seatX - centerX, centerY - seatY));
}

function radiusForArc(seatCount: number, arcAngleDeg: number, seatPitch = DEFAULT_SEAT_PITCH) {
  const count = Math.max(1, Math.floor(seatCount));
  const theta = toRad(Math.max(1, arcAngleDeg));
  if (count <= 1) return 0;
  const r = (seatPitch * (count - 1)) / theta;
  return Math.max(30, r);
}

// =========================
// SHAPE 1: THEATRE / AUDITORIUM
// =========================
export function generateTheatreAuditorium(rows: number, seatsPerRow: number): BaseGeneratorResult {
  const rowCount = clampInt(rows, 0, 500);
  const perRow = clampInt(seatsPerRow, 0, 800);
  if (rowCount === 0 || perRow === 0) return { seats: [], suggestedWidth: 0, suggestedHeight: 0 };

  const pad = DEFAULT_SEAT_PITCH;
  const seats: SeatCoord[] = [];
  for (let r = 0; r < rowCount; r++) {
    for (let s = 0; s < perRow; s++) {
      seats.push({
        x: pad + s * DEFAULT_SEAT_PITCH,
        y: pad + r * DEFAULT_ROW_GAP,
        rotation: 0,
        id: seatId(r, s),
      });
    }
  }

  const suggestedWidth = pad * 2 + (perRow - 1) * DEFAULT_SEAT_PITCH;
  const suggestedHeight = pad * 2 + (rowCount - 1) * DEFAULT_ROW_GAP;
  return { seats, suggestedWidth, suggestedHeight };
}

// =========================
// SHAPE 2: SEMI-CIRCLE (Curved Rows)
// =========================
export function generateSemiCircle(
  rows: number,
  seatsPerRow: number,
  arcAngle: number = 160
): BaseGeneratorResult {
  const rowCount = clampInt(rows, 0, 500);
  const perRow = clampInt(seatsPerRow, 0, 800);
  const baseArc = clampNumber(arcAngle || 160, 30, 240);
  if (rowCount === 0 || perRow === 0) return { seats: [], suggestedWidth: 0, suggestedHeight: 0 };

  const pad = CURVED_PAD;
  const baseRadius = radiusForArc(perRow, baseArc, CURVED_SEAT_PITCH);

  const centerX = 0;

  const seats: SeatCoord[] = [];
  for (let r = 0; r < rowCount; r++) {
    const arcForRow = clampNumber(baseArc + r * 2, 30, 220);
    const radius = baseRadius + r * CURVED_ROW_GAP;
    const rowOffsetY = r * CURVED_ROW_GAP;

    const startDeg = -arcForRow / 2;
    const stepDeg = perRow === 1 ? 0 : arcForRow / (perRow - 1);

    for (let s = 0; s < perRow; s++) {
      const a = toRad(startDeg + stepDeg * s);
      const x = centerX + radius * Math.sin(a);
      const y = rowOffsetY + radius * (1 - Math.cos(a));
      seats.push({
        x,
        y,
        rotation: rotationToFocalUp(x, y, centerX, -CURVED_ROW_GAP),
        id: seatId(r, s),
      });
    }
  }

  const normalized = normalizeSeats(seats, 0).seats;
  const b = boundsFromSeats(normalized);
  const suggestedWidth = Math.max(1, b.maxX - b.minX) + pad * 2;
  const suggestedHeight = Math.max(1, b.maxY - b.minY) + pad * 2;
  const padded = normalizeSeats(normalized, pad).seats;

  return { seats: padded, suggestedWidth, suggestedHeight };
}

// =========================
// SHAPE 3: BANQUET (Round Tables)
// =========================
export function generateBanquet(
  tableCount: number,
  seatsPerTable: number,
  tableRadius: number
): BanquetGeneratorResult {
  const count = clampInt(tableCount, 0, 500);
  const perTable = clampInt(seatsPerTable, 0, 80);
  const tRadius = clampNumber(tableRadius || 34, 10, 120);
  if (count === 0 || perTable === 0) return { seats: [], suggestedWidth: 0, suggestedHeight: 0, tables: [] };

  const pad = DEFAULT_SEAT_PITCH;
  const seatRingRadius = tRadius + DEFAULT_SEAT_PITCH;
  const cell = seatRingRadius * 2 + pad * 2;

  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);

  const tables: BanquetTable[] = [];
  const seats: SeatCoord[] = [];

  for (let t = 0; t < count; t++) {
    const gx = t % cols;
    const gy = Math.floor(t / cols);
    const cx = pad + gx * cell + cell / 2;
    const cy = pad + gy * cell + cell / 2;
    tables.push({ cx, cy, radius: tRadius });

    for (let s = 0; s < perTable; s++) {
      const a = toRad((360 * s) / perTable - 90);
      const x = cx + Math.cos(a) * seatRingRadius;
      const y = cy + Math.sin(a) * seatRingRadius;

      // Spec: Seat rotation = atan2(x - tableX, y - tableY) + 180°
      const rotation = rotationToFocalUp(x, y, cx, cy) + 180;

      seats.push({
        x,
        y,
        rotation,
        id: seatId(t, s),
        tableIndex: t,
      });
    }
  }

  // Normalize including table extents.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of seats) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x);
    maxY = Math.max(maxY, s.y);
  }
  for (const t of tables) {
    minX = Math.min(minX, t.cx - t.radius);
    minY = Math.min(minY, t.cy - t.radius);
    maxX = Math.max(maxX, t.cx + t.radius);
    maxY = Math.max(maxY, t.cy + t.radius);
  }

  const dx = Number.isFinite(minX) ? pad - minX : 0;
  const dy = Number.isFinite(minY) ? pad - minY : 0;
  const normSeats = seats.map((s) => ({ ...s, x: s.x + dx, y: s.y + dy }));
  const normTables = tables.map((t) => ({ ...t, cx: t.cx + dx, cy: t.cy + dy }));

  const suggestedWidth = Math.max(1, maxX - minX) + pad * 2;
  const suggestedHeight = Math.max(1, maxY - minY) + pad * 2;
  return { seats: normSeats, suggestedWidth, suggestedHeight, tables: normTables };
}

// =========================
// SHAPE 4: STANDING BLOCK
// =========================
export function generateStandingBlock(capacity: number): StandingBlockGeneratorResult {
  const cap = clampInt(capacity, 0, 1_000_000);
  return {
    seats: [],
    suggestedWidth: 420,
    suggestedHeight: 280,
    standingArea: { capacity: cap },
  };
}

// =========================
// SHAPE 5: CHEVRON (V-shape)
// =========================
export function generateChevron(rows: number, seatsPerRow: number, angle: number = 30): BaseGeneratorResult {
  const rowCount = clampInt(rows, 0, 500);
  const perRow = clampInt(seatsPerRow, 0, 400);
  const a = clampNumber(angle || 30, 0, 60);
  if (rowCount === 0 || perRow === 0) return { seats: [], suggestedWidth: 0, suggestedHeight: 0 };

  const gap = CHEVRON_CENTER_AISLE;
  const sideShiftPerRow = Math.tan(toRad(a)) * CHEVRON_ROW_GAP;
  const seats: SeatCoord[] = [];

  for (let r = 0; r < rowCount; r++) {
    const y = r * CHEVRON_ROW_GAP;
    const rowShift = r * sideShiftPerRow;
    for (let s = 0; s < perRow; s++) {
      const leftX = -gap / 2 - rowShift - s * CHEVRON_SEAT_PITCH;
      const rightX = gap / 2 + rowShift + s * CHEVRON_SEAT_PITCH;

      seats.push({ x: leftX, y, rotation: -a, id: seatId(r, s) });
      seats.push({ x: rightX, y, rotation: a, id: seatId(r, perRow + s) });
    }
  }

  const pad = CHEVRON_PAD;
  const normalized0 = normalizeSeats(seats, 0).seats;
  const b = boundsFromSeats(normalized0);
  const suggestedWidth = Math.max(1, b.maxX - b.minX) + pad * 2;
  const suggestedHeight = Math.max(1, b.maxY - b.minY) + pad * 2;

  const padded = normalizeSeats(normalized0, pad).seats;

  return { seats: padded, suggestedWidth, suggestedHeight };
}

// ============================================================
// Legacy exports used by current renderers (temporary)
// ============================================================

// CurvedRows legacy: maps to semi-circle seats (arcAngle default 160).
export function generateCurvedRows(rows: number, seatsPerRow: number, arcAngle: number): SeatCoord[] {
  return generateSemiCircle(rows, seatsPerRow, arcAngle || 160).seats;
}

// RoundTable legacy: maps to banquet with default table radius.
export function generateRoundTable(tablesCount: number, seatsPerTable: number): SeatCoord[] {
  return generateBanquet(tablesCount, seatsPerTable, 34).seats;
}

// Fan legacy: kept for backward compatibility (will be removed when palette switches to the 5 official shapes).
export function generateFanShape(rows: number, startSeats: number, increment: number): SeatCoord[] {
  const rowCount = clampInt(rows, 0, 500);
  const start = clampInt(startSeats, 0, 800);
  const inc = Math.max(0, Math.floor(increment));
  if (rowCount === 0 || start === 0) return [];

  const pad = DEFAULT_SEAT_PITCH;
  const centerX = 0;
  const seats: SeatCoord[] = [];

  for (let r = 0; r < rowCount; r++) {
    const seatCount = clampInt(start + r * inc, 0, 1200);
    if (seatCount === 0) continue;

    const arcAngleDeg = clampNumber(80 + r * 8, 60, 170);
    const radius = radiusForArc(seatCount, arcAngleDeg) + r * (DEFAULT_ROW_GAP * 0.9);
    const centerY = pad + radius + r * (DEFAULT_ROW_GAP * 0.8);

    const startDeg = -arcAngleDeg / 2;
    const stepDeg = seatCount === 1 ? 0 : arcAngleDeg / (seatCount - 1);

    for (let s = 0; s < seatCount; s++) {
      const a = toRad(startDeg + stepDeg * s);
      const x = centerX + radius * Math.sin(a);
      const y = centerY - radius * Math.cos(a);
      seats.push({
        x,
        y,
        rotation: rotationToPointFormula(x, y, centerX, centerY),
        id: seatId(r, s),
      });
    }
  }

  return normalizeSeats(seats, pad).seats;
}
