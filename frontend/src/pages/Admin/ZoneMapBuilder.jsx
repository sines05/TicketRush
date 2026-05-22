import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Grid3X3, Layers3, MousePointer2, Palette, Save, Sparkles, Ticket, X } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { ShapePalette, readAddZoneActionFromDrop } from '../../components/SeatBuilder/ShapePalette.tsx';
import { ZoneBlock } from '../../components/SeatBuilder/ZoneBlock.tsx';
import { formatVND } from '../../utils/formatters.js';
import {
  generateBanquet,
  generateChevron,
  generateStandingBlock,
  generateTheatreAuditorium
} from '../../components/SeatBuilder/shapeGenerators.ts';

const DRAFT_STORAGE_PREFIX = 'ticketrush:zone-map-draft:';
const SAVE_MESSAGE_TYPE = 'ticketrush:zone-map-saved';

const SHAPE_LABELS = {
  theatre: 'Theatre',
  banquet: 'Banquet',
  standing_block: 'Standing',
  chevron: 'Chevron'
};

const SHAPE_TYPES = new Set(['theatre', 'banquet', 'standing_block', 'chevron']);

function clampNumber(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampInt(value, min, max, fallback = min) {
  return Math.floor(clampNumber(value, min, max, fallback));
}

function getShapeType(zone) {
  const raw = typeof zone?.shapeType === 'string' ? zone.shapeType : '';
  if (raw === 'semi_circle') return 'theatre';
  return SHAPE_TYPES.has(raw) ? raw : 'theatre';
}

function getShapeParams(zone) {
  return zone?.shapeParams && typeof zone.shapeParams === 'object' ? zone.shapeParams : {};
}

function buildShapeRowSeatCounts(zone) {
  const shapeType = getShapeType(zone);
  const params = getShapeParams(zone);

  if (shapeType === 'theatre') {
    const rows = clampInt(params.rows, 1, 500, Number(zone?.totalRows) || 1);
    const seatsPerRow = clampInt(params.seatsPerRow, 1, 800, Number(zone?.seatsPerRow) || 1);
    return Array.from({ length: rows }, () => seatsPerRow);
  }

  if (shapeType === 'banquet') {
    const tableCount = clampInt(params.tableCount, 1, 500, Number(zone?.totalRows) || 1);
    const seatsPerTable = clampInt(params.seatsPerTable, 1, 80, Number(zone?.seatsPerRow) || 1);
    return Array.from({ length: tableCount }, () => seatsPerTable);
  }

  if (shapeType === 'standing_block') {
    const capacity = clampInt(params.capacity, 1, 1000000, 100);
    return [capacity];
  }

  const rows = clampInt(params.rows, 1, 500, Number(zone?.totalRows) || 1);
  const seatsPerSide = clampInt(params.seatsPerRow, 1, 400, Math.max(1, Math.floor((Number(zone?.seatsPerRow) || 2) / 2)));
  return Array.from({ length: rows }, () => seatsPerSide * 2);
}

function getShapeSummary(zone) {
  const shapeType = getShapeType(zone);
  const counts = buildShapeRowSeatCounts(zone);
  const total = counts.reduce((sum, v) => sum + (Number(v) || 0), 0);
  const params = getShapeParams(zone);

  if (shapeType === 'banquet') {
    const tableCount = clampInt(params.tableCount, 1, 500, counts.length || 1);
    const seatsPerTable = clampInt(params.seatsPerTable, 1, 80, counts[0] || 1);
    return `${tableCount} tables x ${seatsPerTable} seats`;
  }

  if (shapeType === 'standing_block') return `${total} standing tickets`;

  if (shapeType === 'chevron') {
    const rows = clampInt(params.rows, 1, 500, counts.length || 1);
    const seatsPerSide = clampInt(params.seatsPerRow, 1, 400, Math.max(1, Math.floor((counts[0] || 2) / 2)));
    return `${rows} rows x ${seatsPerSide} seats per side`;
  }

  return `${counts.length} rows x ${counts[0] || 0} seats`;
}

function patchShapeParams(zone, patch) {
  const nextParams = { ...getShapeParams(zone), ...patch };
  const counts = buildShapeRowSeatCounts({ ...zone, shapeParams: nextParams });
  return {
    shapeParams: nextParams,
    totalRows: counts.length || 1,
    seatsPerRow: counts.length ? Math.max(...counts) : 1
  };
}

function getZoneBoxSize(zone) {
  const shapeType = getShapeType(zone);
  const counts = buildShapeRowSeatCounts(zone);
  const total = counts.reduce((sum, v) => sum + (Number(v) || 0), 0);
  const density = Math.max(0, Math.min(1, Math.sqrt(total) / 40));

  if (shapeType === 'banquet') {
    return {
      width: 150 + density * 40,
      height: 150 + density * 40
    };
  }

  if (shapeType === 'standing_block') {
    return {
      width: 180 + density * 70,
      height: 110 + density * 50
    };
  }

  if (shapeType === 'chevron') {
    return {
      width: 180 + density * 60,
      height: 130 + density * 50
    };
  }

  return {
    width: 170 + density * 70,
    height: 120 + density * 50
  };
}

function makeUniqueZoneName(existingZones, baseName) {
  const fallback = String(baseName || 'Zone').trim() || 'Zone';
  const existingNames = new Set((existingZones || []).map((zone) => String(zone?.name || '').trim().toLowerCase()).filter(Boolean));
  if (!existingNames.has(fallback.toLowerCase())) return fallback;

  let suffix = 2;
  while (existingNames.has(`${fallback} ${suffix}`.toLowerCase())) {
    suffix += 1;
  }
  return `${fallback} ${suffix}`;
}

function createDefaultZone() {
  return {
    key: `zone-1-${Math.random().toString(16).slice(2)}`,
    name: 'Front Stalls',
    price: 1200000,
    totalRows: 5,
    seatsPerRow: 10,
    posX: 50,
    posY: 20,
    color: '#60a5fa',
    seatType: 'seated',
    shapeType: 'theatre',
    shapeParams: { rows: 5, seatsPerRow: 10 }
  };
}

function normalizeZone(zone, index = 0) {
  const shapeType = getShapeType(zone);
  const shapeParams = getShapeParams(zone);
  const counts = buildShapeRowSeatCounts({ ...zone, shapeType, shapeParams });
  return {
    key: zone?.key || `zone-${index + 1}-${Math.random().toString(16).slice(2)}`,
    name: zone?.name || `Zone ${index + 1}`,
    price: Number(zone?.price) || 0,
    totalRows: counts.length || 1,
    seatsPerRow: counts.length ? Math.max(...counts) : 1,
    posX: clampNumber(zone?.posX, 0, 100, 50),
    posY: clampNumber(zone?.posY, 0, 100, 20 + index * 40),
    color: zone?.color || '#60a5fa',
    seatType: shapeType === 'standing_block' ? 'standing' : 'seated',
    shapeType,
    shapeParams
  };
}

function getDraftStorageKey(draftKey) {
  return `${DRAFT_STORAGE_PREFIX}${draftKey}`;
}

function readDraft(draftKey) {
  if (!draftKey || typeof window === 'undefined') return [createDefaultZone()];
  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(draftKey));
    if (!raw) return [createDefaultZone()];
    const parsed = JSON.parse(raw);
    const zones = Array.isArray(parsed?.zones) ? parsed.zones : [];
    if (!zones.length) return [createDefaultZone()];
    return zones.map((zone, index) => normalizeZone(zone, index));
  } catch {
    return [createDefaultZone()];
  }
}

function saveDraft(draftKey, zones) {
  if (!draftKey || typeof window === 'undefined') return;
  window.localStorage.setItem(
    getDraftStorageKey(draftKey),
    JSON.stringify({
      saved_at: new Date().toISOString(),
      zones
    })
  );
}

function buildZoneDetail(zone) {
  const shapeType = getShapeType(zone);
  const params = getShapeParams(zone);

  if (shapeType === 'banquet') {
    const tableCount = clampInt(params.tableCount, 1, 500, zone.totalRows);
    const seatsPerTable = clampInt(params.seatsPerTable, 1, 80, zone.seatsPerRow);
    const tableRadius = clampNumber(params.tableRadius, 10, 120, 34);
    return { shapeType, ...generateBanquet(tableCount, seatsPerTable, tableRadius) };
  }

  if (shapeType === 'standing_block') {
    const capacity = clampInt(params.capacity, 1, 1000000, zone.seatsPerRow);
    return { shapeType, ...generateStandingBlock(capacity) };
  }

  if (shapeType === 'chevron') {
    const rows = clampInt(params.rows, 1, 500, zone.totalRows);
    const seatsPerSide = clampInt(params.seatsPerRow, 1, 400, Math.max(1, Math.floor(zone.seatsPerRow / 2)));
    const angle = clampNumber(params.angle, 0, 60, 30);
    return { shapeType, ...generateChevron(rows, seatsPerSide, angle) };
  }

  const rows = clampInt(params.rows, 1, 500, zone.totalRows);
  const seatsPerRow = clampInt(params.seatsPerRow, 1, 800, zone.seatsPerRow);
  return { shapeType: 'theatre', ...generateTheatreAuditorium(rows, seatsPerRow) };
}

function ZoneDetailPreview({ zone }) {
  const detail = useMemo(() => buildZoneDetail(zone), [zone]);

  if (detail.shapeType === 'standing_block') {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-[28px] border border-dashed border-teal-500/25 bg-white/45 shadow-inner dark:border-cyan-300/20 dark:bg-white/[0.05]">
        <div
          className="flex h-40 w-72 items-center justify-center rounded-3xl border-2 text-center text-lg font-black shadow-[0_18px_50px_rgba(15,118,110,0.16)]"
          style={{
            borderColor: zone.color || '#60a5fa',
            backgroundColor: `${zone.color || '#60a5fa'}22`,
            color: zone.color || '#60a5fa'
          }}
        >
          Standing zone
          <br />
          {detail.standingArea.capacity} tickets
        </div>
      </div>
    );
  }

  const width = Math.max(240, detail.suggestedWidth || 240);
  const height = Math.max(220, detail.suggestedHeight || 220);
  const showLabels = detail.seats.length <= 60;

  return (
    <div className="overflow-auto rounded-[28px] border border-teal-500/20 bg-white/55 p-4 shadow-inner dark:border-cyan-300/15 dark:bg-white/[0.05]">
      <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-[340px] max-w-full">
        {detail.tables?.map((table, index) => (
          <circle
            key={`table-${index}`}
            cx={table.cx}
            cy={table.cy}
            r={table.radius}
            fill={`${zone.color || '#60a5fa'}1A`}
            stroke={zone.color || '#60a5fa'}
            strokeWidth="3"
          />
        ))}
        {detail.seats.map((seat) => (
          <g key={seat.id} transform={`translate(${seat.x}, ${seat.y})`}>
            <circle r="6" fill={zone.color || '#60a5fa'} fillOpacity="0.85" />
            {showLabels ? (
              <text y="2" textAnchor="middle" fontSize="4.5" fill="white">
                {seat.id}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function ZoneMapBuilder() {
  const [searchParams] = useSearchParams();
  const draftKey = searchParams.get('draft') || '';
  const placementRef = useRef(null);

  const [zones, setZones] = useState(() => readDraft(draftKey));
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);
  const [dragging, setDragging] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [saveState, setSaveState] = useState('');

  const activeZone = zones[activeZoneIndex] || zones[0] || null;

  useEffect(() => {
    setZones(readDraft(draftKey));
    setActiveZoneIndex(0);
  }, [draftKey]);

  useEffect(() => {
    const el = placementRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const ro = new ResizeObserver((entries) => {
      const rect = entries?.[0]?.contentRect;
      if (!rect) return;
      setCanvasSize({ width: rect.width, height: rect.height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function clampPlacement(zone, nextX, nextY, rect) {
    const box = getZoneBoxSize(zone);
    const halfW = rect.width ? (box.width / rect.width) * 50 : 0;
    const halfH = rect.height ? (box.height / rect.height) * 50 : 0;
    return {
      x: clampNumber(nextX, halfW, 100 - halfW, 50),
      y: clampNumber(nextY, halfH, 100 - halfH, 50)
    };
  }

  function checkZoneOverlap(candidate, candidateIndex, rect) {
    const candidateBox = getZoneBoxSize(candidate);
    const candidateCenterX = (candidate.posX / 100) * rect.width;
    const candidateCenterY = (candidate.posY / 100) * rect.height;
    
    const SAFETY_GAP = 30; // 30px safety buffer between dashed borders

    return zones.some((zone, index) => {
      if (index === candidateIndex) return false;
      const box = getZoneBoxSize(zone);
      const centerX = ((Number(zone.posX) || 0) / 100) * rect.width;
      const centerY = ((Number(zone.posY) || 0) / 100) * rect.height;

      // Improved collision box including safety gap
      return !(
        candidateCenterX + candidateBox.width / 2 + SAFETY_GAP < centerX - box.width / 2 ||
        candidateCenterX - candidateBox.width / 2 - SAFETY_GAP > centerX + box.width / 2 ||
        candidateCenterY + candidateBox.height / 2 + SAFETY_GAP < centerY - box.height / 2 ||
        candidateCenterY - candidateBox.height / 2 - SAFETY_GAP > centerY + box.height / 2
      );
    });
  }

  useEffect(() => {
    if (!dragging) return undefined;

    function onMove(e) {
      const el = placementRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      const rawX = dragging.originX + (dx / rect.width) * 100;
      const rawY = dragging.originY + (dy / rect.height) * 100;

      setZones((prev) => {
        const current = prev[dragging.zoneIndex];
        if (!current) return prev;

        const clamped = clampPlacement(current, rawX, rawY, rect);
        const nextZone = { ...current, posX: clamped.x, posY: clamped.y };
        
        // Allow free movement during drag for better UX, 
        // validation happens via visual cues or on save
        return prev.map((zone, index) => (index === dragging.zoneIndex ? nextZone : zone));
      });
    }

    function onUp() {
      setDragging(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, zones]);

  function setZoneField(index, patch) {
    setZones((prev) => {
      const current = prev[index];
      if (!current) return prev;
      
      const nextZone = { ...current, ...patch };
      return prev.map((zone, zoneIndex) => (zoneIndex === index ? nextZone : zone));
    });
  }

  function addZone(shapeType, zoneDefaults, dropPoint = null) {
    const defaults = zoneDefaults && typeof zoneDefaults === 'object' ? zoneDefaults : {};
    const seatMode = defaults.seatMode === 'standing' ? 'standing' : 'seated';
    const nextShapeType = SHAPE_TYPES.has(shapeType) ? shapeType : 'theatre';

    const shapeParams = defaults.shapeParams && typeof defaults.shapeParams === 'object'
      ? defaults.shapeParams
      : {};

    const nextZone = normalizeZone(
      {
        name: makeUniqueZoneName(zones, defaults.name || `${SHAPE_LABELS[nextShapeType]} Zone`),
        price: Number(defaults.price) || 0,
        color: defaults.color || '#60a5fa',
        seatType: seatMode,
        shapeType: nextShapeType,
        shapeParams
      },
      zones.length
    );

    const rect = placementRef.current?.getBoundingClientRect();
    if (dropPoint && rect?.width && rect?.height) {
      const rawX = ((dropPoint.x - rect.left) / rect.width) * 100;
      const rawY = ((dropPoint.y - rect.top) / rect.height) * 100;
      const clamped = clampPlacement(nextZone, rawX, rawY, rect);
      nextZone.posX = clamped.x;
      nextZone.posY = clamped.y;
    }

    setZones((prev) => prev.concat({ ...nextZone, key: `zone-${prev.length + 1}-${Math.random().toString(16).slice(2)}` }));
    setActiveZoneIndex(zones.length);
  }

  function removeActiveZone() {
    if (zones.length <= 1) return;
    setZones((prev) => prev.filter((_, index) => index !== activeZoneIndex));
    setActiveZoneIndex((index) => Math.max(0, index - 1));
  }

  function handleSave() {
    saveDraft(draftKey, zones);
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: SAVE_MESSAGE_TYPE,
          draftKey,
          zones
        },
        window.location.origin
      );
    }
    setSaveState('Saved');
  }

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_10%_8%,rgba(251,191,36,0.18),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(20,184,166,0.18),transparent_32%),linear-gradient(135deg,#f8fafc,#ecfeff_46%,#fff7ed)] px-4 py-6 dark:bg-[radial-gradient(circle_at_10%_8%,rgba(245,158,11,0.16),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(34,211,238,0.14),transparent_32%),linear-gradient(135deg,#020617,#0f172a_48%,#111827)] sm:px-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="relative overflow-hidden rounded-[32px] border border-teal-500/20 bg-white/72 p-5 shadow-[0_30px_100px_rgba(15,118,110,0.16)] backdrop-blur dark:border-cyan-300/15 dark:bg-white/[0.07]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.16] dark:opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(15,118,110,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(15,118,110,.35) 1px, transparent 1px)', backgroundSize: '34px 34px' }} />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-100/75 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-800 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">
                <Sparkles className="h-3.5 w-3.5" />
                Seating studio
              </div>
              <div className="mt-4 text-3xl font-black leading-none text-slate-950 sm:text-4xl dark:text-white">Zone map builder</div>
              <div className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">Drag shapes into the canvas, then click a zone to edit and inspect its seat detail below.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {saveState ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-100/70 px-3 py-2 text-sm font-bold text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">
                  <CheckCircle2 className="h-4 w-4" />
                  {saveState}
                </div>
              ) : null}
              <Button variant="secondary" onClick={() => window.close()}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[288px_minmax(0,1fr)_384px]">
          <div className="min-w-0 rounded-[28px] border border-teal-500/20 bg-white/70 p-4 shadow-[0_18px_60px_rgba(15,118,110,0.12)] backdrop-blur dark:border-cyan-300/15 dark:bg-white/[0.07]">
            <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-teal-800 dark:text-cyan-100">
              <Palette className="h-4 w-4 text-amber-500" />
              Shape palette
            </div>
          <ShapePalette />
        </div>

          <div className="min-w-0 rounded-[28px] border border-teal-500/20 bg-white/72 p-4 shadow-[0_18px_60px_rgba(15,118,110,0.12)] backdrop-blur dark:border-cyan-300/15 dark:bg-white/[0.07]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-teal-800 dark:text-cyan-100">
                <Grid3X3 className="h-4 w-4 text-amber-500" />
                Canvas
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-50/80 px-3 py-1.5 text-xs font-bold text-teal-800 dark:border-cyan-300/15 dark:bg-cyan-300/10 dark:text-cyan-100">
                <MousePointer2 className="h-3.5 w-3.5" />
                Shapes stay inside the frame and cannot overlap.
              </div>
            </div>
            <div className="overflow-hidden rounded-[26px] border border-teal-500/20 bg-[radial-gradient(circle_at_50%_12%,rgba(251,191,36,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.78),rgba(240,253,250,0.72))] shadow-inner dark:border-cyan-300/15 dark:bg-[radial-gradient(circle_at_50%_12%,rgba(245,158,11,0.10),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.86))]">
            <div
              ref={placementRef}
              className="relative h-[68vh] min-h-[560px] bg-[linear-gradient(rgba(15,118,110,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(15,118,110,0.10)_1px,transparent_1px)] bg-[length:28px_28px]"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const action = readAddZoneActionFromDrop(e);
                const shapeType = action?.payload?.shapeType;
                if (!shapeType) return;
                addZone(shapeType, action.payload.zoneDefaults, { x: e.clientX, y: e.clientY });
              }}
            >
              <div className="absolute left-4 right-4 top-4 flex items-center justify-center">
                <div className="h-2 w-3/5 rounded-full bg-gradient-to-r from-amber-300 via-teal-300 to-cyan-300 shadow-[0_0_24px_rgba(20,184,166,0.35)]" aria-hidden="true" />
              </div>

              {zones.map((zone, index) => {
                const box = getZoneBoxSize(zone);
                const left = ((Number(zone.posX) || 0) / 100) * (canvasSize.width || 1);
                const top = ((Number(zone.posY) || 0) / 100) * (canvasSize.height || 1);

                return (
                  <ZoneBlock
                    key={zone.key}
                    zone={{
                      id: zone.key,
                      name: zone.name,
                      price: Number(zone.price) || 0,
                      color: zone.color || '#60a5fa',
                      width: box.width,
                      height: box.height,
                      seatMode: zone.seatType === 'standing' ? 'standing' : 'seated',
                      shapeType: getShapeType(zone),
                      shapeParams: getShapeParams(zone)
                    }}
                    onClick={() => setActiveZoneIndex(index)}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setActiveZoneIndex(index);
                      setDragging({
                        zoneIndex: index,
                        startX: e.clientX,
                        startY: e.clientY,
                        originX: Number(zone.posX) || 0,
                        originY: Number(zone.posY) || 0
                      });
                    }}
                    className={
                      index === activeZoneIndex
                        ? 'cursor-grab rounded-3xl border-2 border-amber-300/80 bg-amber-200/10 drop-shadow-[0_18px_32px_rgba(245,158,11,0.22)] active:cursor-grabbing'
                        : 'cursor-grab rounded-3xl border border-white/20 bg-white/10 drop-shadow-[0_14px_28px_rgba(15,118,110,0.16)] active:cursor-grabbing'
                    }
                    style={{ left, top, transform: 'translate(-50%, -50%)' }}
                  />
                );
              })}
            </div>
          </div>
        </div>

          <div className="min-w-0 rounded-[28px] border border-teal-500/20 bg-white/70 p-4 shadow-[0_18px_60px_rgba(15,118,110,0.12)] backdrop-blur dark:border-cyan-300/15 dark:bg-white/[0.07] [&_input]:rounded-2xl [&_input]:border-teal-700/15 [&_input]:bg-white/80 [&_input]:px-4 [&_input]:py-3 [&_input]:text-[16px] [&_input]:font-semibold [&_input]:text-slate-950 [&_input]:shadow-sm [&_input]:outline-none [&_input]:transition [&_input]:focus:border-teal-500/70 [&_input]:focus:ring-4 [&_input]:focus:ring-teal-500/15 dark:[&_input]:border-white/10 dark:[&_input]:bg-white/[0.08] dark:[&_input]:text-white dark:[&_input]:focus:border-cyan-300/50 dark:[&_input]:focus:ring-cyan-300/15">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-teal-800 dark:text-cyan-100">
              <Layers3 className="h-4 w-4 text-amber-500" />
              Zones
            </div>
          <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
            {zones.map((zone, index) => {
              const total = buildShapeRowSeatCounts(zone).reduce((sum, value) => sum + value, 0);
              return (
                <button
                  key={zone.key}
                  type="button"
                  onClick={() => setActiveZoneIndex(index)}
                  className={`w-full rounded-2xl border p-3 text-left text-sm shadow-sm transition hover:-translate-y-0.5 ${
                    index === activeZoneIndex
                      ? 'border-amber-400/50 bg-amber-100/70 text-amber-950 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100'
                      : 'border-teal-700/10 bg-white/55 text-slate-600 hover:bg-teal-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white'
                  }`}
                >
                  <div className="font-semibold truncate">{zone.name || `Zone ${index + 1}`}</div>
                  <div className="mt-1 text-xs">{formatVND(Number(zone.price) || 0)}</div>
                  <div className="mt-1 text-[10px] text-muted">
                    {SHAPE_LABELS[getShapeType(zone)]} - {getShapeSummary(zone)} - {total} seats
                  </div>
                </button>
              );
            })}
          </div>

          {activeZone ? (
            <div className="mt-4 space-y-4">
              <div className="text-sm font-black text-slate-900 dark:text-white">Zone configuration</div>
              <Input label="Zone name" value={activeZone.name} onChange={(e) => setZoneField(activeZoneIndex, { name: e.target.value })} />
              <Input
                label="Price (VND)"
                type="number"
                value={activeZone.price}
                onChange={(e) => setZoneField(activeZoneIndex, { price: e.target.value })}
              />

              <label className="block">
                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-teal-800/80 dark:text-cyan-100/80">Zone color</div>
                <input
                  type="color"
                  value={activeZone.color || '#60a5fa'}
                  onChange={(e) => setZoneField(activeZoneIndex, { color: e.target.value })}
                  className="h-12 w-full"
                />
              </label>

              <div className="rounded-2xl border border-teal-700/10 bg-teal-50/70 p-3 dark:border-cyan-300/15 dark:bg-cyan-300/10">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-teal-800/70 dark:text-cyan-100/70">Shape</div>
                <div className="mt-1 text-sm font-black text-slate-950 dark:text-white">{SHAPE_LABELS[getShapeType(activeZone)]}</div>
                <div className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">{getShapeSummary(activeZone)}</div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-teal-700/10 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                {getShapeType(activeZone) === 'theatre' ? (
                  <>
                    <Input
                      label="Rows"
                      type="number"
                      value={getShapeParams(activeZone).rows ?? activeZone.totalRows}
                      onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { rows: e.target.value }))}
                    />
                    <Input
                      label="Seats per row"
                      type="number"
                      value={getShapeParams(activeZone).seatsPerRow ?? activeZone.seatsPerRow}
                      onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { seatsPerRow: e.target.value }))}
                    />
                  </>
                ) : null}

                {getShapeType(activeZone) === 'banquet' ? (
                  <>
                    <Input
                      label="Tables"
                      type="number"
                      value={getShapeParams(activeZone).tableCount ?? activeZone.totalRows}
                      onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { tableCount: e.target.value }))}
                    />
                    <Input
                      label="Seats per table"
                      type="number"
                      value={getShapeParams(activeZone).seatsPerTable ?? activeZone.seatsPerRow}
                      onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { seatsPerTable: e.target.value }))}
                    />
                    <Input
                      label="Table radius"
                      type="number"
                      value={getShapeParams(activeZone).tableRadius ?? 34}
                      onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { tableRadius: e.target.value }))}
                    />
                  </>
                ) : null}

                {getShapeType(activeZone) === 'standing_block' ? (
                  <Input
                    label="Capacity"
                    type="number"
                    value={getShapeParams(activeZone).capacity ?? activeZone.seatsPerRow}
                    onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { capacity: e.target.value }))}
                  />
                ) : null}

                {getShapeType(activeZone) === 'chevron' ? (
                  <>
                    <Input
                      label="Rows"
                      type="number"
                      value={getShapeParams(activeZone).rows ?? activeZone.totalRows}
                      onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { rows: e.target.value }))}
                    />
                    <Input
                      label="Seats per side"
                      type="number"
                      value={getShapeParams(activeZone).seatsPerRow ?? Math.max(1, Math.floor(activeZone.seatsPerRow / 2))}
                      onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { seatsPerRow: e.target.value }))}
                    />
                    <Input
                      label="Angle"
                      type="number"
                      value={getShapeParams(activeZone).angle ?? 30}
                      onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { angle: e.target.value }))}
                    />
                  </>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-teal-700/10 pt-4 dark:border-white/10">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="font-black text-teal-800 dark:text-cyan-100">
                    {buildShapeRowSeatCounts(activeZone).reduce((sum, value) => sum + value, 0)}
                  </span>{' '}
                  seats
                </div>
                <Button variant="secondary" size="sm" onClick={removeActiveZone} disabled={zones.length <= 1}>
                  Remove zone
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {activeZone ? (
        <section className="overflow-hidden rounded-[28px] border border-teal-500/20 bg-white/72 p-5 shadow-[0_18px_60px_rgba(15,118,110,0.12)] backdrop-blur dark:border-cyan-300/15 dark:bg-white/[0.07]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-teal-800 dark:text-cyan-100">
                <Ticket className="h-4 w-4 text-amber-500" />
                Selected zone detail
              </div>
              <div className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">Detailed seats appear only for the selected zone.</div>
            </div>
            <div className="rounded-full border border-teal-500/20 bg-teal-50/80 px-3 py-1.5 text-sm font-black text-teal-800 dark:border-cyan-300/15 dark:bg-cyan-300/10 dark:text-cyan-100">{activeZone.name}</div>
          </div>
          <ZoneDetailPreview zone={activeZone} />
        </section>
      ) : null}
      </div>
    </div>
  );
}
