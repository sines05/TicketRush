import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    const capacity = clampInt(params.capacity, 1, 1000000, Number(zone?.seatsPerRow) || 1);
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
    posX: 18,
    posY: 28,
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
    posX: clampNumber(zone?.posX, 0, 100, Math.min(85, 18 + index * 16)),
    posY: clampNumber(zone?.posY, 0, 100, 28 + (index % 2) * 24),
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
      <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-text/10 bg-bg/20">
        <div
          className="flex h-40 w-72 items-center justify-center rounded-2xl border-2 text-center text-lg font-semibold"
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
    <div className="overflow-auto rounded-2xl border border-text/10 bg-bg/20 p-4">
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

    return zones.some((zone, index) => {
      if (index === candidateIndex) return false;
      const box = getZoneBoxSize(zone);
      const centerX = ((Number(zone.posX) || 0) / 100) * rect.width;
      const centerY = ((Number(zone.posY) || 0) / 100) * rect.height;

      return !(
        candidateCenterX + candidateBox.width / 2 < centerX - box.width / 2 ||
        candidateCenterX - candidateBox.width / 2 > centerX + box.width / 2 ||
        candidateCenterY + candidateBox.height / 2 < centerY - box.height / 2 ||
        candidateCenterY - candidateBox.height / 2 > centerY + box.height / 2
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
        if (checkZoneOverlap(nextZone, dragging.zoneIndex, rect)) return prev;

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
    setZones((prev) => prev.map((zone, zoneIndex) => (zoneIndex === index ? { ...zone, ...patch } : zone)));
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
    <div className="mx-auto max-w-[1600px] space-y-6 p-6">
      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Zone map builder</div>
            <div className="text-sm text-muted">Drag shapes into the canvas, then click a zone to edit and inspect its seat detail below.</div>
          </div>
          <div className="flex items-center gap-2">
            {saveState ? <div className="text-sm text-muted">{saveState}</div> : null}
            <Button variant="secondary" onClick={() => window.close()}>
              Close
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-4">
        <div className="w-72 shrink-0 rounded-2xl border border-text/10 bg-surface p-4">
          <div className="mb-3 text-sm font-semibold">Shape palette</div>
          <ShapePalette />
        </div>

        <div className="min-w-0 flex-1 rounded-2xl border border-text/10 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Canvas</div>
            <div className="text-xs text-muted">Shapes stay inside the frame and cannot overlap.</div>
          </div>
          <div className="overflow-hidden rounded-xl border border-text/10 bg-bg/40">
            <div
              ref={placementRef}
              className="relative h-[68vh] min-h-[560px]"
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
                <div className="h-2 w-3/5 rounded-full bg-brand-600/35" aria-hidden="true" />
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
                        ? 'border-brand-600/70 bg-brand-600/10 cursor-grab active:cursor-grabbing'
                        : 'border-text/10 bg-surface cursor-grab active:cursor-grabbing'
                    }
                    style={{ left, top, transform: 'translate(-50%, -50%)' }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-96 shrink-0 rounded-2xl border border-text/10 bg-surface p-4">
          <div className="text-sm font-semibold">Zones</div>
          <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
            {zones.map((zone, index) => {
              const total = buildShapeRowSeatCounts(zone).reduce((sum, value) => sum + value, 0);
              return (
                <button
                  key={zone.key}
                  type="button"
                  onClick={() => setActiveZoneIndex(index)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                    index === activeZoneIndex
                      ? 'border-brand-600/60 bg-brand-600/15 text-text'
                      : 'border-text/10 bg-bg/30 text-muted hover:bg-text/5 hover:text-text'
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
              <div className="text-sm font-semibold">Zone configuration</div>
              <Input label="Zone name" value={activeZone.name} onChange={(e) => setZoneField(activeZoneIndex, { name: e.target.value })} />
              <Input
                label="Price (VND)"
                type="number"
                value={activeZone.price}
                onChange={(e) => setZoneField(activeZoneIndex, { price: e.target.value })}
              />

              <label className="block">
                <div className="mb-1 text-sm text-muted">Zone color</div>
                <input
                  type="color"
                  value={activeZone.color || '#60a5fa'}
                  onChange={(e) => setZoneField(activeZoneIndex, { color: e.target.value })}
                  className="h-10 w-full rounded-md border border-text/10 bg-surface"
                />
              </label>

              <div className="rounded-xl border border-text/10 bg-bg/30 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Shape</div>
                <div className="mt-1 text-sm font-semibold">{SHAPE_LABELS[getShapeType(activeZone)]}</div>
                <div className="mt-1 text-xs text-muted">{getShapeSummary(activeZone)}</div>
              </div>

              <div className="grid gap-3 rounded-xl border border-text/10 bg-bg/20 p-3">
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

              <div className="flex items-center justify-between border-t border-text/10 pt-4">
                <div className="text-xs text-muted">
                  <span className="font-semibold">
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
        <section className="rounded-2xl border border-text/10 bg-surface p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Selected zone detail</div>
              <div className="text-xs text-muted">Detailed seats appear only for the selected zone.</div>
            </div>
            <div className="text-sm text-muted">{activeZone.name}</div>
          </div>
          <ZoneDetailPreview zone={activeZone} />
        </section>
      ) : null}
    </div>
  );
}
