import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, Copy, ImagePlus, Layers3, MapPin, Rocket, Save, Sparkles, Ticket, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { formatVND } from '../../utils/formatters.js';
import eventService from '../../services/eventService.js';
import uploadService from '../../services/uploadService.js';
import { resolveMediaUrl } from '../../utils/media.js';
import { CATEGORY_OPTIONS, getCategoryKey } from '../../constants/categories.js';
import { ShapePalette, readAddZoneActionFromDrop } from '../../components/SeatBuilder/ShapePalette.tsx';
import { FloorGroup } from '../../components/SeatBuilder/FloorGroup.tsx';
import { ZoneBlock } from '../../components/SeatBuilder/ZoneBlock.tsx';

const SHAPE_LABELS = {
  theatre: 'Theatre',
  semi_circle: 'Bán nguyệt',
  banquet: 'Bàn tròn',
  standing_block: 'Khu đứng',
  chevron: 'Chữ V',
  legacy: 'Lưới ghế'
};

const SHAPE_TYPES = new Set(['theatre', 'banquet', 'standing_block', 'chevron']);
const ZONE_MAP_DRAFT_PREFIX = 'ticketrush:zone-map-draft:';
const ZONE_MAP_SAVE_MESSAGE = 'ticketrush:zone-map-saved';
const showLegacyZoneBuilder = import.meta.env.VITE_SHOW_LEGACY_ZONE_BUILDER === 'true';

function clampNumber(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampInt(value, min, max, fallback = min) {
  return Math.floor(clampNumber(value, min, max, fallback));
}

function getShapeType(zone) {
  const type = typeof zone?.shapeType === 'string' ? zone.shapeType : '';
  if (type === 'semi_circle') return 'theatre';
  return SHAPE_TYPES.has(type) ? type : 'legacy';
}

function getShapeParams(zone) {
  return zone?.shapeParams && typeof zone.shapeParams === 'object' ? zone.shapeParams : {};
}

function buildShapeRowSeatCounts(zone) {
  const shapeType = getShapeType(zone);
  if (shapeType === 'legacy') return null;

  const params = getShapeParams(zone);
  if (shapeType === 'theatre' || shapeType === 'semi_circle') {
    const rows = clampInt(params.rows, 1, 500, Number(zone?.totalRows) || 1);
    const seatsPerRow = clampInt(params.seatsPerRow, 1, 800, Number(zone?.seatsPerRow) || 1);
    return Array.from({ length: rows }, () => seatsPerRow);
  }

  if (shapeType === 'banquet') {
    const tableCount = clampInt(params.tableCount ?? params.tablesCount, 1, 500, Number(zone?.totalRows) || 1);
    const seatsPerTable = clampInt(params.seatsPerTable, 1, 80, Number(zone?.seatsPerRow) || 1);
    return Array.from({ length: tableCount }, () => seatsPerTable);
  }

  if (shapeType === 'standing_block') {
    const capacity = clampInt(params.capacity, 1, 1000000, Number(zone?.seatsPerRow) || 1);
    return [capacity];
  }

  if (shapeType === 'chevron') {
    const rows = clampInt(params.rows, 1, 500, Number(zone?.totalRows) || 1);
    const seatsPerSide = clampInt(params.seatsPerRow, 1, 400, Math.max(1, Math.floor((Number(zone?.seatsPerRow) || 2) / 2)));
    return Array.from({ length: rows }, () => seatsPerSide * 2);
  }

  return null;
}

function getShapeSummary(zone) {
  const shapeType = getShapeType(zone);
  const counts = buildRowSeatCounts(zone);
  const total = counts.reduce((sum, v) => sum + (Number(v) || 0), 0);
  const params = getShapeParams(zone);

  if (shapeType === 'banquet') {
    const tableCount = clampInt(params.tableCount ?? params.tablesCount, 1, 500, counts.length || 1);
    const seatsPerTable = clampInt(params.seatsPerTable, 1, 80, counts[0] || 1);
    return `${tableCount} bàn x ${seatsPerTable} ghế`;
  }

  if (shapeType === 'standing_block') return `${total} vé đứng`;

  if (shapeType === 'chevron') {
    const rows = clampInt(params.rows, 1, 500, counts.length || 1);
    const seatsPerSide = clampInt(params.seatsPerRow, 1, 400, Math.max(1, Math.floor((counts[0] || 2) / 2)));
    return `${rows} hàng x ${seatsPerSide} ghế/mỗi cánh`;
  }

  if (shapeType === 'semi_circle') {
    const rows = clampInt(params.rows, 1, 500, counts.length || 1);
    const seatsPerRow = clampInt(params.seatsPerRow, 1, 800, counts[0] || 1);
    return `${rows} cung x ${seatsPerRow} ghế`;
  }

  return `${counts.length} hàng x ${counts[0] || 0} ghế`;
}

function patchShapeParams(zone, patch) {
  const nextParams = { ...getShapeParams(zone), ...patch };
  const counts = buildShapeRowSeatCounts({ ...zone, shapeParams: nextParams }) || [];
  return {
    shapeParams: nextParams,
    totalRows: counts.length || 1,
    seatsPerRow: counts.length ? Math.max(...counts) : 1,
    customCounts: ''
  };
}

function parseCounts(text) {
  const raw = String(text || '')
    .split(/[\s,]+/g)
    .map((v) => v.trim())
    .filter(Boolean);

  const counts = raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.floor(n));

  return counts;
}

function buildRowSeatCounts(zone) {
  if (!zone) return [];

  const shapeCounts = buildShapeRowSeatCounts(zone);
  if (shapeCounts) return shapeCounts;

  const totalRows = Math.max(0, Number(zone.totalRows) || 0);
  const seatsPerRow = Math.max(0, Number(zone.seatsPerRow) || 0);
  const taperedStart = Math.max(0, Number(zone.taperedStart) || 0);
  const taperedEnd = Math.max(0, Number(zone.taperedEnd) || 0);

  switch (zone.layout) {
    case 'tapered': {
      if (totalRows <= 0) return [];
      if (taperedStart <= 0 || taperedEnd <= 0) return [];
      if (totalRows === 1) return [taperedStart];

      const out = [];
      for (let i = 0; i < totalRows; i++) {
        const t = i / (totalRows - 1);
        const v = Math.round(taperedStart + (taperedEnd - taperedStart) * t);
        out.push(Math.max(1, v));
      }
      return out;
    }
    case 'pyramid': {
      if (totalRows <= 0) return [];
      const minSeats = Math.max(1, Math.floor(seatsPerRow / 2));
      const maxSeats = seatsPerRow;
      
      if (totalRows === 1) return [maxSeats];
      
      const out = [];
      const midPoint = Math.floor(totalRows / 2);
      
      for (let i = 0; i < totalRows; i++) {
        if (i <= midPoint) {
          // Expand phase
          const t = i / midPoint;
          const v = Math.round(minSeats + (maxSeats - minSeats) * t);
          out.push(v);
        } else {
          // Contract phase
          const t = (i - midPoint) / (totalRows - midPoint - 1);
          const v = Math.round(maxSeats - (maxSeats - minSeats) * t);
          out.push(Math.max(1, v));
        }
      }
      return out;
    }
    case 'custom': {
      return parseCounts(zone.customCounts);
    }
    case 'grid':
    default: {
      if (totalRows <= 0 || seatsPerRow <= 0) return [];
      return Array.from({ length: totalRows }, () => seatsPerRow);
    }
  }
}

function getZoneBoxSize(zone) {
  const counts = buildRowSeatCounts(zone);
  const totalSeats = counts.reduce((sum, v) => sum + (Number(v) || 0), 0);
  const sizeFactor = Math.sqrt(totalSeats) * 12;
  const width = Math.max(80, Math.min(200, sizeFactor));
  const height = Math.max(60, Math.min(150, sizeFactor));
  const sizePercent = Math.max(5, Math.min(20, Math.sqrt(totalSeats))); // % for collision
  return { width, height, sizePercent };
}

function makeUniqueZoneName(existingZones, baseName) {
  const fallback = String(baseName || 'Zone').trim() || 'Zone';
  const existingNames = new Set(
    (existingZones || [])
      .map((zone) => String(zone?.name || '').trim().toLowerCase())
      .filter(Boolean)
  );

  if (!existingNames.has(fallback.toLowerCase())) return fallback;

  let suffix = 2;
  while (existingNames.has(`${fallback} ${suffix}`.toLowerCase())) {
    suffix += 1;
  }

  return `${fallback} ${suffix}`;
}

export default function EventForm() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const isEdit = Boolean(eventId);

  const placementRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [existingBannerUrl, setExistingBannerUrl] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [startsAt, setStartsAt] = useState('2026-06-01T18:00');
  const [endsAt, setEndsAt] = useState('2026-06-01T20:00');
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [category, setCategory] = useState('');

  const [zones, setZones] = useState(() => [
    {
      key: 'zone-1',
      name: 'Front Stalls',
      price: 1200000,
      layout: 'grid',
      totalRows: 5,
      seatsPerRow: 10,
      taperedStart: 12,
      taperedEnd: 6,
      customCounts: '',
      renderAlign: 'left',
      renderStyle: 'plain',
      aisleSize: 2,
      posX: 15,
      posY: 30,
      color: '#60a5fa',
      seatType: 'seated',
      shapeType: 'theatre',
      shapeParams: { rows: 5, seatsPerRow: 10 }
    }
  ]);
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [dragging, setDragging] = useState(null);

  const [floorGroups, setFloorGroups] = useState(() => [
    { id: 'floor-1', name: 'Floor 1', isCollapsed: false },
    { id: 'balcony', name: 'Balcony', isCollapsed: false },
    { id: 'pit', name: 'Pit', isCollapsed: false }
  ]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const activeZone = zones[activeZoneIndex] || zones[0] || null;
  const zoneMapDraftKeyRef = useRef(`event-form-${eventId || 'new'}-${Math.random().toString(16).slice(2)}`);

  useEffect(() => {
    function onZoneMapSaved(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== ZONE_MAP_SAVE_MESSAGE) return;
      if (event.data?.draftKey !== zoneMapDraftKeyRef.current) return;
      if (!Array.isArray(event.data?.zones)) return;
      setZones(event.data.zones);
    }

    window.addEventListener('message', onZoneMapSaved);
    return () => window.removeEventListener('message', onZoneMapSaved);
  }, []);

  function openZoneMapBuilder() {
    const draftKey = zoneMapDraftKeyRef.current;
    try {
      window.localStorage.setItem(
        `${ZONE_MAP_DRAFT_PREFIX}${draftKey}`,
        JSON.stringify({
          saved_at: new Date().toISOString(),
          zones
        })
      );
    } catch {
      // ignore local storage failures and still try to open the builder
    }

    const builderUrl = new URL('/admin/events/zone-map', window.location.origin);
    builderUrl.searchParams.set('draft', draftKey);
    window.open(builderUrl.toString(), '_blank');
  }

  useEffect(() => {
    const el = placementRef.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver((entries) => {
      const rect = entries?.[0]?.contentRect;
      if (!rect) return;
      setCanvasSize({ width: rect.width, height: rect.height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Collision detection: check if two zones overlap
  function checkZoneOverlap(z1, z2) {
    const size1 = getZoneBoxSize(z1).sizePercent; // % size
    const size2 = getZoneBoxSize(z2).sizePercent;
    const margin = size1; // margin equal to box size
    
    const x1Min = (Number(z1.posX) || 0) - size1 / 2;
    const x1Max = (Number(z1.posX) || 0) + size1 / 2;
    const y1Min = (Number(z1.posY) || 0) - size1 / 2;
    const y1Max = (Number(z1.posY) || 0) + size1 / 2;

    const x2Min = (Number(z2.posX) || 0) - size2 / 2 - margin;
    const x2Max = (Number(z2.posX) || 0) + size2 / 2 + margin;
    const y2Min = (Number(z2.posY) || 0) - size2 / 2 - margin;
    const y2Max = (Number(z2.posY) || 0) + size2 / 2 + margin;

    return !(x1Max < x2Min || x1Min > x2Max || y1Max < y2Min || y1Min > y2Max);
  }

  useEffect(() => {
    if (!dragging) return;

    function onMove(e) {
      const el = placementRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      const nextX = dragging.originX + (dx / rect.width) * 100;
      const nextY = dragging.originY + (dy / rect.height) * 100;

      const clampedX = Math.max(0, Math.min(100, nextX));
      const clampedY = Math.max(0, Math.min(100, nextY));

      setZones((prev) => {
        const nextZones = prev.map((z, i) =>
          i === dragging.zoneIndex
            ? { ...z, posX: clampedX, posY: clampedY }
            : z
        );

        // Check for overlaps and prevent if collision detected
        const draggingZone = nextZones[dragging.zoneIndex];
        const hasOverlap = nextZones.some((z, i) =>
          i !== dragging.zoneIndex && checkZoneOverlap(draggingZone, z)
        );

        if (hasOverlap) {
          return prev; // Keep original position
        }
        return nextZones;
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
  }, [dragging]);

  const rowSeatCounts = useMemo(() => buildRowSeatCounts(activeZone), [activeZone]);

  const totalSeatsInActiveZone = useMemo(() => rowSeatCounts.reduce((sum, v) => sum + (Number(v) || 0), 0), [rowSeatCounts]);

  const bannerPreview = useMemo(() => {
    if (!bannerFile) return '';
    return URL.createObjectURL(bannerFile);
  }, [bannerFile]);

  useEffect(() => {
    if (!bannerFile || !bannerPreview) return;
    return () => {
      try {
        URL.revokeObjectURL(bannerPreview);
      } catch {
        // ignore
      }
    };
  }, [bannerFile, bannerPreview]);

  useEffect(() => {
    if (!isEdit) return;
    let mounted = true;
    setLoading(true);
    setError('');

    Promise.all([eventService.getEventDetail(eventId), eventService.getSeatMap(eventId)])
      .then(([evt, sm]) => {
        if (!mounted) return;

        setTitle(evt?.title || '');
        setDescription(evt?.description || '');
        setLocation(evt?.location || '');
        setExistingBannerUrl(evt?.banner_url || '');
        setIsPublished(Boolean(evt?.is_published));
        setIsFeatured(Boolean(evt?.is_featured));
        setCategory(getCategoryKey(evt?.category || ''));

        const toLocal = (iso) => {
          const d = new Date(iso);
          if (Number.isNaN(d.getTime())) return '';
          const pad = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        setStartsAt(toLocal(evt?.start_time) || startsAt);
        setEndsAt(toLocal(evt?.end_time) || endsAt);

        const nextZones = (sm?.zones || []).map((z, idx) => {
          const byRow = new Map();
          for (const s of z?.seats || []) {
            const key = s.row_label;
            byRow.set(key, (byRow.get(key) || 0) + 1);
          }
          const rowLabels = [...byRow.keys()].sort();
          const counts = rowLabels.map((k) => byRow.get(k) || 0);
          const max = counts.length ? Math.max(...counts) : 0;
          const uniform = counts.length > 0 && counts.every((c) => c === max);

          const meta = z?.layout_meta || {};
          const renderAlign = meta?.align === 'right' || meta?.align === 'left' || meta?.align === 'center' ? meta.align : 'left';
          const renderStyle = meta?.style === 'center_aisle' || meta?.style === 'three_blocks' || meta?.style === 'plain' ? meta.style : 'plain';
          const aisleSize = Math.max(1, Math.min(6, Number(meta?.aisle_size) || 2));
          const posX = Number.isFinite(Number(meta?.pos_x)) ? Math.max(0, Math.min(100, Number(meta?.pos_x))) : Math.min(85, 15 + idx * 18);
          const posY = Number.isFinite(Number(meta?.pos_y)) ? Math.max(0, Math.min(100, Number(meta?.pos_y))) : 30 + (idx % 2) * 28;
          const color = meta?.color || '#60a5fa';
          const seatType = meta?.seat_type === 'standing' ? 'standing' : 'seated';

          const rawShapeType = meta?.shape_type || meta?.shapeType || z?.shape_type || z?.shapeType;
          const shapeType = typeof rawShapeType === 'string' && rawShapeType.trim().length ? rawShapeType : null;
          const rawShapeParams = meta?.shape_params || meta?.shapeParams;
          const shapeParams = rawShapeParams && typeof rawShapeParams === 'object' ? rawShapeParams : {};

          return {
            key: `zone-${idx + 1}-${z.zone_id}`,
            name: z?.name || `Zone ${idx + 1}`,
            price: Number(z?.price) || 0,
            layout: uniform ? 'grid' : 'custom',
            totalRows: counts.length || 1,
            seatsPerRow: max || 1,
            taperedStart: max || 1,
            taperedEnd: max || 1,
            customCounts: counts.join(','),
            renderAlign,
            renderStyle,
            aisleSize,
            posX,
            posY,
            color,
            seatType,
            shapeType: shapeType || 'legacy',
            shapeParams:
              shapeType && Object.keys(shapeParams || {}).length
                ? shapeParams
                : seatType === 'standing'
                  ? { capacity: counts.reduce((sum, v) => sum + (Number(v) || 0), 0) }
                  : { rows: counts.length || 1, seatsPerRow: max || 1 }
          };
        });

        if (nextZones.length) {
          setZones(nextZones);
          setActiveZoneIndex(0);
        }
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Không tải được dữ liệu sự kiện');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, eventId]);

  const payload = useMemo(() => {
    const zonesPayload = zones.map((z) => {
      const counts = buildRowSeatCounts(z);
      const total_rows = counts.length || Math.max(0, Number(z.totalRows) || 0);
      const seats_per_row = counts.length ? Math.max(...counts) : Math.max(0, Number(z.seatsPerRow) || 0);

      const normalizedShapeType = getShapeType(z);
      const shouldPersistShape = normalizedShapeType !== 'legacy';
      const shapeParams = getShapeParams(z);
      const capacity = counts.reduce((sum, v) => sum + (Number(v) || 0), 0);
      const out = {
        name: z.name,
        price: Number(z.price) || 0,
        total_rows,
        seats_per_row,
        row_seat_counts: counts,
        seat_type: z.seatType || 'seated',
        color: z.color || '#60a5fa',
        capacity,
        shape_type: shouldPersistShape ? normalizedShapeType : 'theatre',
        layout_meta: {
          align: shouldPersistShape || z.layout === 'grid' ? 'left' : z.renderAlign || 'left',
          style: z.renderStyle || 'plain',
          aisle_size: Math.max(1, Math.min(6, Number(z.aisleSize) || 2)),
          pos_x: Math.max(0, Math.min(100, Number(z.posX) || 0)),
          pos_y: Math.max(0, Math.min(100, Number(z.posY) || 0)),
          color: z.color || '#60a5fa',
          seat_type: z.seatType || 'seated',
          ...(shouldPersistShape
            ? {
                shape_type: normalizedShapeType,
                shape_params: shapeParams,
              }
            : {}),
        }
      };

      return out;
    });

    return {
      title,
      description,
      location,
      banner_url: null,
      category,
      start_time: startsAt ? new Date(startsAt).toISOString() : '',
      end_time: endsAt ? new Date(endsAt).toISOString() : '',
      is_published: Boolean(isPublished),
      is_featured: Boolean(isFeatured),
      zones: zonesPayload
    };
  }, [title, description, location, category, startsAt, endsAt, isPublished, isFeatured, zones]);

  function setZoneField(index, patch) {
    setZones((prev) => prev.map((z, i) => (i === index ? { ...z, ...patch } : z)));
  }

  function addZone(shapeType, zoneDefaults) {
    setZones((prev) => {
      const nextIndex = prev.length;
      const normalizedShapeType = typeof shapeType === 'string' ? shapeType : null;
      const defaults = zoneDefaults && typeof zoneDefaults === 'object' ? zoneDefaults : null;
      const seatMode = defaults?.seatMode === 'standing' ? 'standing' : 'seated';
      const isStanding = seatMode === 'standing' || normalizedShapeType === 'standing' || normalizedShapeType === 'standing_block';

      const defaultShapeParams = defaults?.shapeParams && typeof defaults.shapeParams === 'object' ? defaults.shapeParams : {};

      const canonicalSeatCounts = (() => {
        if (normalizedShapeType === 'theatre' || normalizedShapeType === 'semi_circle') {
          const rows = Number(defaultShapeParams.rows) || (normalizedShapeType === 'theatre' ? 10 : 6);
          const seatsPerRow = Number(defaultShapeParams.seatsPerRow) || (normalizedShapeType === 'theatre' ? 14 : 12);
          return { totalRows: rows, seatsPerRow };
        }
        if (normalizedShapeType === 'banquet') {
          const tableCount = Number(defaultShapeParams.tableCount) || 4;
          const seatsPerTable = Number(defaultShapeParams.seatsPerTable) || 8;
          return { totalRows: tableCount, seatsPerRow: seatsPerTable };
        }
        if (normalizedShapeType === 'standing_block') {
          const cap = Number(defaultShapeParams.capacity) || 300;
          return { totalRows: 1, seatsPerRow: cap };
        }
        if (normalizedShapeType === 'chevron') {
          const rows = Number(defaultShapeParams.rows) || 8;
          const perSide = Number(defaultShapeParams.seatsPerRow) || 7;
          return { totalRows: rows, seatsPerRow: perSide * 2 };
        }
        return null;
      })();

      const shapeDefaults = (() => {
        if (normalizedShapeType === 'fan') return { totalRows: 7, seatsPerRow: 10, customCounts: '6,8,10,12,14,16,18', layout: 'custom' };
        if (normalizedShapeType === 'curved_rows') return { totalRows: 6, seatsPerRow: 12, customCounts: '', layout: 'grid' };
        if (normalizedShapeType === 'round_table') return { totalRows: 1, seatsPerRow: 8, customCounts: '', layout: 'grid' };
        if (normalizedShapeType === 'standing') return { totalRows: 1, seatsPerRow: 50, customCounts: '', layout: 'grid' };
        if (canonicalSeatCounts) return { totalRows: canonicalSeatCounts.totalRows, seatsPerRow: canonicalSeatCounts.seatsPerRow, customCounts: '', layout: 'grid' };
        return { totalRows: 5, seatsPerRow: 10, customCounts: '', layout: 'grid' };
      })();

      const shapeParams = (() => {
        if (normalizedShapeType === 'curved_rows') return { rows: 6, seatsPerRow: 12, arcAngle: 180 };
        if (normalizedShapeType === 'round_table') return { tablesCount: 1, seatsPerTable: 8 };
        if (normalizedShapeType === 'fan') return { rows: 7, startSeats: 6, increment: 2 };
        if (normalizedShapeType === 'standing') return { width: 240, height: 160 };
        if (Object.keys(defaultShapeParams || {}).length) return defaultShapeParams;
        return {};
      })();

      const next = prev.concat({
        key: `zone-${prev.length + 1}-${Math.random().toString(16).slice(2)}`,
        name: makeUniqueZoneName(
          prev,
          defaults?.name || (normalizedShapeType ? `${normalizedShapeType.replace(/_/g, ' ')} Zone` : 'Zone')
        ),
        price: Number(defaults?.price) || 150000,
        layout: shapeDefaults.layout,
        totalRows: shapeDefaults.totalRows,
        seatsPerRow: shapeDefaults.seatsPerRow,
        taperedStart: 12,
        taperedEnd: 6,
        customCounts: shapeDefaults.customCounts,
        renderAlign: 'left',
        renderStyle: 'plain',
        aisleSize: 2,
        posX: Math.min(85, 15 + nextIndex * 18),
        posY: 30 + (nextIndex % 2) * 28,
        color: defaults?.color || '#60a5fa',
        seatType: isStanding ? 'standing' : 'seated',

        // Extended (non-CRUD) shape metadata; ignored by payload mapping.
        shapeType: normalizedShapeType || 'legacy',
        shapeParams,
        floorGroupId: null,
      });
      setActiveZoneIndex(nextIndex);
      return next;
    });
  }

  function onAssignZoneToGroup(zoneId, groupId) {
    setZones((prev) => prev.map((z) => (z.key === zoneId ? { ...z, floorGroupId: groupId } : z)));
  }

  function onToggleGroupCollapse(groupId) {
    if (groupId === '__unassigned__') return;
    setFloorGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, isCollapsed: !g.isCollapsed } : g)));
  }

  function removeActiveZone() {
    if (zones.length <= 1) return;
    setZones((prev) => prev.filter((_, i) => i !== activeZoneIndex));
    setActiveZoneIndex((idx) => Math.max(0, idx - 1));
  }

  function validate() {
    if (!String(title || '').trim()) return 'Vui lòng nhập tên sự kiện';
    if (!String(category || '').trim()) return 'Vui lòng chọn thể loại';
    if (!startsAt) return 'Vui lòng chọn thời gian bắt đầu';
    if (!endsAt) return 'Vui lòng chọn thời gian kết thúc';
    if (!zones.length) return 'Cần ít nhất 1 zone';

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);
    if (Number.isNaN(startDate.getTime())) return 'Thời gian bắt đầu không hợp lệ';
    if (Number.isNaN(endDate.getTime())) return 'Thời gian kết thúc không hợp lệ';

    for (const z of zones) {
      if (!String(z.name || '').trim()) return 'Tên zone không được để trống';
      const counts = buildRowSeatCounts(z);
      if (!counts.length) return `Zone "${z.name}" chưa có cấu hình ghế hợp lệ`;
    }

    return '';
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');

    try {
      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }

      const banner_url = bannerFile
        ? await uploadService.uploadImage(bannerFile)
        : isEdit
          ? existingBannerUrl || ''
          : null;

      if (isEdit) {
        await eventService.updateEvent(eventId, { ...payload, banner_url: banner_url || '' });
      } else {
        await eventService.createEvent({ ...payload, banner_url: banner_url || null });
      }
      
      // Navigate to dashboard after successful creation/update
      navigate('/admin/dashboard');
    } catch (e) {
      setError(e?.message || 'Tạo sự kiện thất bại (cần đăng nhập ADMIN).');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    const ok = window.confirm('Xoá sự kiện này?');
    if (!ok) return;

    setSubmitting(true);
    setError('');
    try {
      await eventService.deleteEvent(eventId);
      navigate('/admin/dashboard');
    } catch (e) {
      setError(e?.message || 'Xoá sự kiện thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-teal-500/20 bg-gradient-to-br from-white via-cyan-50/80 to-amber-50/70 p-6 shadow-[0_24px_80px_rgba(15,118,110,0.16)] dark:border-cyan-300/15 dark:from-slate-950 dark:via-teal-950/70 dark:to-zinc-950">
        <div className="flex items-center gap-3 text-sm font-semibold text-teal-800 dark:text-cyan-100">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Đang tải dữ liệu sự kiện...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-teal-500/20 bg-[radial-gradient(circle_at_12%_12%,rgba(251,191,36,0.22),transparent_28%),radial-gradient(circle_at_90%_5%,rgba(20,184,166,0.22),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,253,250,0.88)_48%,rgba(255,251,235,0.86))] shadow-[0_30px_100px_rgba(15,118,110,0.18)] dark:border-cyan-300/15 dark:bg-[radial-gradient(circle_at_12%_12%,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(34,211,238,0.16),transparent_32%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.94)_48%,rgba(17,24,39,0.98))]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.18] dark:opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(15,118,110,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(15,118,110,.35) 1px, transparent 1px)', backgroundSize: '34px 34px' }} />
        <div className="relative border-b border-teal-700/10 px-5 py-6 sm:px-8 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-100/70 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-800 shadow-sm dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">
                <Sparkles className="h-3.5 w-3.5" />
                Admin event studio
              </div>
              <h1 className="mt-4 text-3xl font-black leading-none text-slate-950 sm:text-4xl dark:text-white">
                {isEdit ? 'Sửa sự kiện' : 'Tạo sự kiện'}
              </h1>
              <div className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                Thiết lập thông tin, banner và seating plan theo zones + layout trong một không gian gọn hơn.
              </div>
            </div>
            <div className="grid min-w-[210px] grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl border border-white/60 bg-white/65 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.07]">
                <div className="text-slate-500 dark:text-slate-400">Zones</div>
                <div className="mt-1 text-2xl font-black text-teal-700 dark:text-cyan-200">{zones.length}</div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/65 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.07]">
                <div className="text-slate-500 dark:text-slate-400">Seat preview</div>
                <div className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-200">{totalSeatsInActiveZone}</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="relative mx-5 mt-5 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm font-semibold text-danger sm:mx-8">{error}</div>
        )}

        <div className="relative grid gap-x-5 gap-y-4 px-5 py-6 sm:px-8 md:grid-cols-2">
          <label className="block">
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-teal-800/80 dark:text-cyan-100/80">Tên sự kiện</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Rock Night 2026"
              className="w-full rounded-2xl border border-teal-700/15 bg-white/78 px-4 py-3 text-[16px] font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500/70 focus:ring-4 focus:ring-teal-500/15 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-300/50 dark:focus:ring-cyan-300/15"
            />
          </label>
          <label className="block">
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-teal-800/80 dark:text-cyan-100/80">Thể loại</div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-teal-700/15 bg-white/78 px-4 py-3 text-[16px] font-semibold text-slate-950 shadow-sm outline-none transition focus:border-teal-500/70 focus:ring-4 focus:ring-teal-500/15 dark:border-white/10 dark:bg-slate-900/80 dark:text-white dark:focus:border-cyan-300/50 dark:focus:ring-cyan-300/15"
            >
              <option value="">-- Chọn thể loại --</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-teal-800/80 dark:text-cyan-100/80">
              <CalendarClock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
              Thời gian bắt đầu
            </div>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-2xl border border-teal-700/15 bg-white/78 px-4 py-3 text-[16px] font-semibold text-slate-950 shadow-sm outline-none transition focus:border-teal-500/70 focus:ring-4 focus:ring-teal-500/15 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:focus:border-cyan-300/50 dark:focus:ring-cyan-300/15"
            />
          </label>
          <label className="block">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-teal-800/80 dark:text-cyan-100/80">
              <MapPin className="h-3.5 w-3.5 text-rose-500 dark:text-rose-300" />
              Location
            </div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="VD: My Dinh Stadium, Hanoi"
              className="w-full rounded-2xl border border-teal-700/15 bg-white/78 px-4 py-3 text-[16px] font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500/70 focus:ring-4 focus:ring-teal-500/15 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-300/50 dark:focus:ring-cyan-300/15"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-teal-800/80 dark:text-cyan-100/80">Mô tả</div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về sự kiện"
              className="w-full rounded-2xl border border-teal-700/15 bg-white/78 px-4 py-3 text-[16px] font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500/70 focus:ring-4 focus:ring-teal-500/15 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-300/50 dark:focus:ring-cyan-300/15"
            />
          </label>

          <label className="block">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-teal-800/80 dark:text-cyan-100/80">
              <ImagePlus className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-300" />
              Banner sự kiện (tuỳ chọn)
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
              className="w-full rounded-2xl border border-teal-700/15 bg-white/78 px-4 py-2.5 text-[16px] font-semibold text-slate-950 shadow-sm outline-none transition file:mr-3 file:rounded-xl file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-teal-800 focus:border-teal-500/70 focus:ring-4 focus:ring-teal-500/15 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:file:bg-cyan-300 dark:file:text-slate-950 dark:hover:file:bg-cyan-200"
            />
            {(bannerPreview || existingBannerUrl) && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/60 bg-white/50 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                <img
                  src={bannerPreview || resolveMediaUrl(existingBannerUrl)}
                  alt="banner preview"
                  className="h-36 w-full object-cover"
                />
              </div>
            )}
          </label>

          <label className="block">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-teal-800/80 dark:text-cyan-100/80">
              <CalendarClock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
              Thời gian kết thúc
            </div>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-2xl border border-teal-700/15 bg-white/78 px-4 py-3 text-[16px] font-semibold text-slate-950 shadow-sm outline-none transition focus:border-teal-500/70 focus:ring-4 focus:ring-teal-500/15 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:focus:border-cyan-300/50 dark:focus:ring-cyan-300/15"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-teal-700/10 bg-white/55 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-5 w-5 accent-teal-600"
            />
            Publish ngay (is_published)
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-100/45 px-4 py-3 text-sm font-bold text-amber-900 shadow-sm dark:border-amber-300/15 dark:bg-amber-300/10 dark:text-amber-100">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-5 w-5 accent-amber-500"
            />
            Đưa lên Banner Trang chủ
          </label>
        </div>

        <div className="relative mx-5 mb-6 overflow-hidden rounded-[28px] border border-teal-500/20 bg-gradient-to-br from-teal-700 via-cyan-700 to-slate-900 p-5 text-white shadow-[0_24px_70px_rgba(15,118,110,0.25)] sm:mx-8 dark:border-cyan-200/15 dark:from-teal-950 dark:via-slate-900 dark:to-zinc-950">
          <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-amber-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
                <Layers3 className="h-4 w-4 text-amber-300" />
                Zone map
              </div>
              <div className="mt-2 text-sm text-cyan-50/80">Mo builder o tab moi de thiet ke zone map va luu lai zones.</div>
            </div>
            <Button onClick={openZoneMapBuilder}>
              <Ticket className="mr-2 h-4 w-4" />
              Thiết lập Zone chi tiết
            </Button>
          </div>

          <div className="relative mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {zones.map((z, idx) => {
              const counts = buildRowSeatCounts(z);
              const total = counts.reduce((sum, v) => sum + (Number(v) || 0), 0);
              return (
                <div key={z.key} className="rounded-2xl border border-white/15 bg-white/12 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/16">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-white">{z.name || `Zone ${idx + 1}`}</div>
                      <div className="mt-1 text-xs font-semibold text-cyan-100/70">{SHAPE_LABELS[getShapeType(z)] || 'Zone'}</div>
                    </div>
                    <div
                      className="h-4 w-4 shrink-0 rounded-full border border-white/40 shadow"
                      style={{ backgroundColor: z.color || '#60a5fa' }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-3 text-sm font-black text-amber-200">{formatVND(Number(z.price) || 0)}</div>
                  <div className="mt-1 text-xs text-cyan-50/70">{getShapeSummary(z)}</div>
                  <div className="mt-1 text-xs font-bold text-white/80">{total} ghe</div>
                </div>
              );
            })}
          </div>
        </div>

        {showLegacyZoneBuilder && (
        <div className="mt-6 flex gap-4">
          {/* LEFT: Shape palette */}
          <div className="w-72 shrink-0">
            <div className="rounded-2xl border border-text/10 bg-bg/40 p-4">
              <div className="text-sm font-semibold mb-3">Shape Palette</div>
              <ShapePalette />
            </div>
          </div>

          {/* MIDDLE: Canvas */}
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl border border-text/10 bg-bg/40 p-4">
              <div className="text-sm font-semibold mb-3">Canvas</div>
              <div className="overflow-hidden rounded-xl border border-text/10 bg-bg/40">
                <div
                  ref={placementRef}
                  className="relative h-[70vh] min-h-[520px]"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const action = readAddZoneActionFromDrop(e);
                    const shapeType = action?.payload?.shapeType;
                    const zoneDefaults = action?.payload?.zoneDefaults;
                    if (shapeType) addZone(shapeType, zoneDefaults);
                  }}
                >
                  <div className="absolute left-3 right-3 top-3 flex items-center justify-center">
                    <div className="h-2 w-3/5 rounded-full bg-brand-600/40" aria-hidden="true" />
                  </div>

                  {(() => {
                    const UNASSIGNED_ID = '__unassigned__';
                    const allGroups = [{ id: UNASSIGNED_ID, name: 'Unassigned', isCollapsed: false }].concat(floorGroups);

                    const byGroup = new Map();
                    for (const g of allGroups) byGroup.set(g.id, []);
                    for (let i = 0; i < zones.length; i++) {
                      const z = zones[i];
                      const gid = z.floorGroupId || UNASSIGNED_ID;
                      if (!byGroup.has(gid)) byGroup.set(gid, []);
                      byGroup.get(gid).push({ z, idx: i });
                    }

                    const zoneBox = (z) => getZoneBoxSize(z);
                    const centerPx = (z) => {
                      const x = (Math.max(0, Math.min(100, Number(z.posX) || 0)) / 100) * (canvasSize.width || 1);
                      const y = (Math.max(0, Math.min(100, Number(z.posY) || 0)) / 100) * (canvasSize.height || 1);
                      return { x, y };
                    };

                    const groupBounds = (items) => {
                      if (!items.length) return null;
                      let minX = Infinity;
                      let minY = Infinity;
                      let maxX = -Infinity;
                      let maxY = -Infinity;
                      for (const it of items) {
                        const z = it.z;
                        const c = centerPx(z);
                        const s = zoneBox(z);
                        minX = Math.min(minX, c.x - s.width / 2);
                        minY = Math.min(minY, c.y - s.height / 2);
                        maxX = Math.max(maxX, c.x + s.width / 2);
                        maxY = Math.max(maxY, c.y + s.height / 2);
                      }

                      const pad = 18;
                      minX = Math.max(0, minX - pad);
                      minY = Math.max(0, minY - pad);
                      maxX = Math.min(canvasSize.width || 1, maxX + pad);
                      maxY = Math.min(canvasSize.height || 1, maxY + pad);

                      return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(40, maxY - minY) };
                    };

                    return allGroups
                      .map((g) => {
                        const items = byGroup.get(g.id) || [];
                        const bounds = groupBounds(items);
                        if (!bounds) return null;
                        return (
                          <FloorGroup
                            key={g.id}
                            group={g}
                            bounds={bounds}
                            allGroups={floorGroups}
                            onToggleCollapse={onToggleGroupCollapse}
                            onAssignZoneToGroup={onAssignZoneToGroup}
                          >
                            {items.map(({ z, idx }) => {
                              const s = zoneBox(z);
                              const c = centerPx(z);
                              const left = c.x - bounds.x;
                              const top = c.y - bounds.y;
                              const shapeType = typeof z.shapeType === 'string' ? z.shapeType : 'legacy';
                              const shapeParams = z.shapeParams && typeof z.shapeParams === 'object' ? z.shapeParams : {};
                              return (
                                <ZoneBlock
                                  key={`zone-pos-${z.key}`}
                                  zone={{
                                    id: z.key,
                                    name: z.name,
                                    price: Number(z.price) || 0,
                                    color: z.color || '#60a5fa',
                                    width: s.width,
                                    height: s.height,
                                    seatMode: z.seatType === 'standing' ? 'standing' : 'seated',
                                    shapeType,
                                    shapeParams
                                  }}
                                  onClick={() => setActiveZoneIndex(idx)}
                                  onPointerDown={(e) => {
                                    e.preventDefault();
                                    const originX = Number(z.posX) || 0;
                                    const originY = Number(z.posY) || 0;
                                    setDragging({ zoneIndex: idx, startX: e.clientX, startY: e.clientY, originX, originY });
                                  }}
                                  className={
                                    idx === activeZoneIndex
                                      ? 'border-brand-600/60 bg-brand-600/15 active:cursor-grabbing cursor-grab'
                                      : 'border-text/10 bg-surface active:cursor-grabbing cursor-grab'
                                  }
                                  style={{ left, top, transform: 'translate(-50%, -50%)' }}
                                />
                              );
                            })}
                          </FloorGroup>
                        );
                      })
                      .filter(Boolean);
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Zone config */}
          <div className="w-96 shrink-0">
            <div className="rounded-2xl border border-text/10 bg-bg/40 p-4">
              <div className="text-sm font-semibold mb-3">Zones</div>
              <div className="max-h-56 overflow-auto pr-1 space-y-2">
                {zones.map((z, idx) => (
                  <button
                    key={z.key}
                    type="button"
                    onClick={() => setActiveZoneIndex(idx)}
                    className={`w-full rounded-lg border p-3 text-sm transition text-left ${
                      idx === activeZoneIndex
                        ? 'border-brand-600/60 bg-brand-600/15 text-text'
                        : 'border-text/10 bg-bg/30 text-muted hover:bg-text/5 hover:text-text'
                    }`}
                  >
                    <div className="font-semibold truncate">{z.name || `Zone ${idx + 1}`}</div>
                    <div className="text-xs mt-1">{formatVND(Number(z.price) || 0)}</div>
                    <div className="text-[10px] text-muted mt-1">
                      {(() => {
                        const counts = buildRowSeatCounts(z);
                        const total = counts.reduce((sum, v) => sum + (Number(v) || 0), 0);
                        return `${SHAPE_LABELS[getShapeType(z)] || 'Zone'} - ${getShapeSummary(z)} - ${total} ghe`;
                      })()}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 text-sm font-semibold mb-4">Zone Configuration</div>

            {activeZone && (
              <div className="space-y-4">
                <Input label="Tên zone" value={activeZone.name} onChange={(e) => setZoneField(activeZoneIndex, { name: e.target.value })} />
                <Input
                  label="Giá (VND)"
                  type="number"
                  value={activeZone.price}
                  onChange={(e) => setZoneField(activeZoneIndex, { price: e.target.value })}
                />

                <div className="rounded-xl border border-text/10 bg-bg/30 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Loai zone</div>
                  <div className="mt-1 text-sm font-semibold">{SHAPE_LABELS[getShapeType(activeZone)] || getShapeType(activeZone)}</div>
                  <div className="mt-1 text-xs text-muted">{getShapeSummary(activeZone)}</div>
                </div>

                {getShapeType(activeZone) !== 'legacy' && (
                  <label className="block mb-3">
                    <div className="mb-1 text-sm text-muted">Mau zone</div>
                    <input
                      type="color"
                      value={activeZone.color || '#60a5fa'}
                      onChange={(e) => setZoneField(activeZoneIndex, { color: e.target.value })}
                      className="w-full h-10 rounded-md border border-text/10 bg-surface"
                    />
                  </label>
                )}

                {getShapeType(activeZone) !== 'legacy' && (
                  <div className="grid gap-3 rounded-xl border border-text/10 bg-bg/20 p-3">
                    {(getShapeType(activeZone) === 'theatre' || getShapeType(activeZone) === 'semi_circle') && (
                      <>
                        <Input
                          label={getShapeType(activeZone) === 'semi_circle' ? 'So cung ghe' : 'So hang'}
                          type="number"
                          value={getShapeParams(activeZone).rows ?? activeZone.totalRows}
                          onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { rows: e.target.value }))}
                        />
                        <Input
                          label="Ghe moi hang"
                          type="number"
                          value={getShapeParams(activeZone).seatsPerRow ?? activeZone.seatsPerRow}
                          onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { seatsPerRow: e.target.value }))}
                        />
                      </>
                    )}

                    {getShapeType(activeZone) === 'semi_circle' && (
                      <Input
                        label="Goc cung (do)"
                        type="number"
                        value={getShapeParams(activeZone).arcAngle ?? 160}
                        onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { arcAngle: e.target.value }))}
                      />
                    )}

                    {getShapeType(activeZone) === 'banquet' && (
                      <>
                        <Input
                          label="So ban tron"
                          type="number"
                          value={getShapeParams(activeZone).tableCount ?? 4}
                          onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { tableCount: e.target.value }))}
                        />
                        <Input
                          label="Ghe moi ban"
                          type="number"
                          value={getShapeParams(activeZone).seatsPerTable ?? 8}
                          onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { seatsPerTable: e.target.value }))}
                        />
                        <Input
                          label="Ban kinh ban"
                          type="number"
                          value={getShapeParams(activeZone).tableRadius ?? 34}
                          onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { tableRadius: e.target.value }))}
                        />
                      </>
                    )}

                    {getShapeType(activeZone) === 'standing_block' && (
                      <Input
                        label="Suc chua ve dung"
                        type="number"
                        value={getShapeParams(activeZone).capacity ?? activeZone.seatsPerRow}
                        onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { capacity: e.target.value }))}
                      />
                    )}

                    {getShapeType(activeZone) === 'chevron' && (
                      <>
                        <Input
                          label="So hang"
                          type="number"
                          value={getShapeParams(activeZone).rows ?? activeZone.totalRows}
                          onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { rows: e.target.value }))}
                        />
                        <Input
                          label="Ghe moi canh"
                          type="number"
                          value={getShapeParams(activeZone).seatsPerRow ?? 7}
                          onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { seatsPerRow: e.target.value }))}
                        />
                        <Input
                          label="Goc mo"
                          type="number"
                          value={getShapeParams(activeZone).angle ?? 30}
                          onChange={(e) => setZoneField(activeZoneIndex, patchShapeParams(activeZone, { angle: e.target.value }))}
                        />
                      </>
                    )}
                  </div>
                )}

                {getShapeType(activeZone) === 'legacy' && (
                  <>
                <label className="block mb-3">
                  <div className="mb-1 text-sm text-muted">Loại ghế</div>
                  <select
                    value={activeZone.seatType || 'seated'}
                    onChange={(e) => setZoneField(activeZoneIndex, { seatType: e.target.value })}
                    className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
                  >
                    <option value="seated">Ngồi (Seated)</option>
                    <option value="standing">Đứng (Standing)</option>
                  </select>
                </label>

                <label className="block mb-3">
                  <div className="mb-1 text-sm text-muted">Màu zone</div>
                  <input
                    type="color"
                    value={activeZone.color || '#60a5fa'}
                    onChange={(e) => setZoneField(activeZoneIndex, { color: e.target.value })}
                    className="w-full h-10 rounded-md border border-text/10 bg-surface"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-sm text-muted">Layout Type</div>
                  <select
                    value={activeZone.layout}
                    onChange={(e) => {
                      const nextLayout = e.target.value;
                      if (nextLayout === 'grid') {
                        setZoneField(activeZoneIndex, { layout: nextLayout, renderAlign: 'left' });
                        return;
                      }
                      setZoneField(activeZoneIndex, { layout: nextLayout });
                    }}
                    className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
                  >
                    <option value="grid">Grid (Lưới đều)</option>
                    <option value="tapered">Tapered (Hình thang - to/nhỏ)</option>
                    <option value="pyramid">Pyramid (Hình chóp - nhỏ đến to)</option>
                    <option value="custom">Custom (Tùy chỉnh từng hàng)</option>
                  </select>
                </label>

                {(activeZone.layout === 'grid' || activeZone.layout === 'tapered' || activeZone.layout === 'pyramid') && (
                  <Input
                    label="Tổng hàng"
                    type="number"
                    value={activeZone.totalRows}
                    onChange={(e) => setZoneField(activeZoneIndex, { totalRows: e.target.value })}
                  />
                )}

                {(activeZone.layout === 'grid' || activeZone.layout === 'pyramid') && (
                  <Input
                    label="Ghế/Hàng"
                    type="number"
                    value={activeZone.seatsPerRow}
                    onChange={(e) => setZoneField(activeZoneIndex, { seatsPerRow: e.target.value })}
                  />
                )}

                {activeZone.layout === 'tapered' && (
                  <>
                    <Input
                      label="Ghế hàng đầu (start)"
                      type="number"
                      value={activeZone.taperedStart}
                      onChange={(e) => setZoneField(activeZoneIndex, { taperedStart: e.target.value })}
                    />
                    <Input
                      label="Ghế hàng cuối (end)"
                      type="number"
                      value={activeZone.taperedEnd}
                      onChange={(e) => setZoneField(activeZoneIndex, { taperedEnd: e.target.value })}
                    />
                  </>
                )}

                {activeZone.layout === 'custom' && (
                  <label className="block">
                    <div className="mb-1 text-sm text-muted">Số ghế từng hàng</div>
                    <textarea
                      value={activeZone.customCounts}
                      onChange={(e) => setZoneField(activeZoneIndex, { customCounts: e.target.value })}
                      placeholder="VD: 12,12,14,14,16,16"
                      rows={3}
                      className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/70 focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
                    />
                    <div className="mt-1 text-xs text-muted">Phân tách bằng dấu phẩy hoặc xuống dòng.</div>
                  </label>
                )}

                <div className="border-t border-text/10 pt-4">
                  <div className="text-xs font-semibold text-muted mb-3">Tùy chọn hiển thị</div>
                  
                  {activeZone.layout !== 'grid' && (
                    <label className="block mb-3">
                      <div className="mb-1 text-sm text-muted">Căn chỉnh ghế</div>
                      <select
                        value={activeZone.renderAlign || 'left'}
                        onChange={(e) => setZoneField(activeZoneIndex, { renderAlign: e.target.value })}
                        className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
                      >
                        <option value="left">Trái</option>
                        <option value="center">Giữa</option>
                        <option value="right">Phải</option>
                      </select>
                    </label>
                  )}

                  <label className="block mb-3">
                    <div className="mb-1 text-sm text-muted">Kiểu hiển thị</div>
                    <select
                      value={activeZone.renderStyle || 'plain'}
                      onChange={(e) => setZoneField(activeZoneIndex, { renderStyle: e.target.value })}
                      className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
                    >
                      <option value="plain">Plain (không có lối đi)</option>
                      <option value="center_aisle">Chia 2 block (lối đi giữa)</option>
                      <option value="three_blocks">3 Block (box sections)</option>
                    </select>
                  </label>

                  {activeZone.renderStyle && activeZone.renderStyle !== 'plain' && (
                    <Input
                      label="Độ rộng lối đi (cột)"
                      type="number"
                      value={activeZone.aisleSize ?? 2}
                      onChange={(e) => setZoneField(activeZoneIndex, { aisleSize: e.target.value })}
                    />
                  )}
                </div>
                  </>
                )}

                <div className="border-t border-text/10 pt-4 flex items-center justify-between">
                  <div className="text-xs text-muted">
                    <span className="font-semibold">{totalSeatsInActiveZone}</span> ghế
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={removeActiveZone} 
                    disabled={zones.length <= 1}
                  >
                    Xoá zone
                  </Button>
                </div>
              </div>
            )}

            {!activeZone && (
              <div className="text-sm text-muted text-center py-8">
                Chọn một zone từ danh sách phía trên để cấu hình
              </div>
            )}
            </div>
          </div>
        </div>

        )}

        <div className="relative mx-5 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur sm:mx-8 dark:border-white/10 dark:bg-white/[0.07]">
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-cyan-300/10 dark:text-cyan-200">
              <Rocket className="h-4 w-4" />
            </span>
            {isEdit ? 'Lưu thay đổi hoặc xoá sự kiện.' : 'Tạo sự kiện trên backend (cần đăng nhập ADMIN).'} 
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Payload JSON
            </Button>
            {isEdit && (
              <Button variant="danger" onClick={handleDelete} disabled={submitting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Xoá
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={submitting}>
              <Save className="mr-2 h-4 w-4" />
              {submitting ? (isEdit ? 'Đang lưu...' : 'Đang tạo...') : isEdit ? 'Lưu thay đổi' : 'Tạo trên backend'}
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-teal-500/15 bg-white/75 p-5 shadow-[0_18px_60px_rgba(15,118,110,0.10)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-teal-800 dark:text-cyan-100">
          <Layers3 className="h-4 w-4 text-amber-500" />
          Dữ liệu sinh ra
        </div>
        <pre className="mt-3 max-h-[360px] overflow-auto rounded-2xl border border-teal-700/10 bg-slate-950 p-4 text-xs text-cyan-50 shadow-inner dark:border-white/10">
          {JSON.stringify(
            {
              note: isEdit ? 'PUT /admin/events/:id' : 'POST /admin/events',
              payload,
              preview_seats_count: totalSeatsInActiveZone
            },
            null,
            2
          )}
        </pre>
      </section>
    </div>
  );
}
