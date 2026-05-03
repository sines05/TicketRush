import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Seat from '../../components/booking/Seat.jsx';
import { SEAT_STATUS } from '../../constants/status.js';
import { formatVND } from '../../utils/formatters.js';
import eventService from '../../services/eventService.js';
import uploadService from '../../services/uploadService.js';
import { CATEGORY_OPTIONS, getCategoryKey, getCategoryLabel } from '../../constants/categories.js';

function rowIndexToLabel(index) {
  return String.fromCharCode('A'.charCodeAt(0) + index);
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

function buildPreviewRows(rowSeatCounts, zoneIndex = 0) {
  const counts = Array.isArray(rowSeatCounts) ? rowSeatCounts : [];
  const maxSeatCount = counts.length ? Math.max(...counts) : 0;
  const rows = [];

  for (let r = 0; r < counts.length; r++) {
    const rowLabel = rowIndexToLabel(r);

    const seats = [];
    for (let c = 1; c <= counts[r]; c++) {
      seats.push({
        seat_id: `preview-${zoneIndex}-${r + 1}-${c}`,
        row_label: rowLabel,
        seat_number: c,
        status: SEAT_STATUS.AVAILABLE,
        shortLabel: String(c)
      });
    }
    rows.push({ rowLabel, seats });
  }

  return { rows, maxSeatCount };
}

function normalizeLayoutMeta(meta) {
  const m = meta || {};
  const align = m.align === 'right' || m.align === 'left' || m.align === 'center' ? m.align : 'left';
  const style = m.style === 'center_aisle' || m.style === 'three_blocks' || m.style === 'plain' ? m.style : 'plain';
  const aisleSize = Math.max(1, Math.min(6, Number(m.aisle_size) || 2));
  return { align, style, aisleSize };
}

function buildRowCells(seatsInRow, maxSeatCount, meta) {
  const seats = Array.isArray(seatsInRow) ? seatsInRow : [];
  const seatCount = seats.length;
  const { align, style, aisleSize } = normalizeLayoutMeta(meta);

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
      cells.push(seats[idx++] || null);
    }
    if (b < blocks.length - 1) {
      for (let i = 0; i < aisleSize; i++) cells.push(null);
    }
  }

  for (let i = 0; i < rightPad; i++) cells.push(null);

  return { cells, cols: totalCols };
}

export default function EventForm() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const isEdit = Boolean(eventId);

  const placementRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
      posY: 30
    }
  ]);
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [dragging, setDragging] = useState(null);

  const activeZone = zones[activeZoneIndex] || zones[0] || null;

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

      setZones((prev) =>
        prev.map((z, i) =>
          i === dragging.zoneIndex
            ? {
                ...z,
                posX: Math.max(0, Math.min(100, nextX)),
                posY: Math.max(0, Math.min(100, nextY))
              }
            : z
        )
      );
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
  const preview = useMemo(() => buildPreviewRows(rowSeatCounts, activeZoneIndex), [rowSeatCounts, activeZoneIndex]);

  const previewLayoutMeta = useMemo(() => {
    return {
      align: activeZone?.renderAlign || 'left',
      style: activeZone?.renderStyle || 'plain',
      aisle_size: activeZone?.aisleSize ?? 2
    };
  }, [activeZone]);

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
            posY
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
      const out = {
        name: z.name,
        price: Number(z.price) || 0,
        total_rows,
        seats_per_row,
        layout_meta: {
          align: z.layout === 'grid' ? 'left' : z.renderAlign || 'left',
          style: z.renderStyle || 'plain',
          aisle_size: Math.max(1, Math.min(6, Number(z.aisleSize) || 2)),
          pos_x: Math.max(0, Math.min(100, Number(z.posX) || 0)),
          pos_y: Math.max(0, Math.min(100, Number(z.posY) || 0))
        }
      };

      if (z.layout === 'custom' || z.layout === 'tapered') {
        out.row_seat_counts = counts;
      }

      return out;
    });

    return {
      title,
      description,
      banner_url: null,
      category: getCategoryLabel(category),
      start_time: startsAt ? new Date(startsAt).toISOString() : '',
      end_time: endsAt ? new Date(endsAt).toISOString() : '',
      is_published: Boolean(isPublished),
      is_featured: Boolean(isFeatured),
      zones: zonesPayload
    };
  }, [title, description, category, startsAt, endsAt, isPublished, isFeatured, zones]);

  function setZoneField(index, patch) {
    setZones((prev) => prev.map((z, i) => (i === index ? { ...z, ...patch } : z)));
  }

  function addZone() {
    setZones((prev) => {
      const nextIndex = prev.length;
      const next = prev.concat({
        key: `zone-${prev.length + 1}-${Math.random().toString(16).slice(2)}`,
        name: `Zone ${prev.length + 1}`,
        price: 150000,
        layout: 'grid',
        totalRows: 5,
        seatsPerRow: 10,
        taperedStart: 12,
        taperedEnd: 6,
        customCounts: '',
        renderAlign: 'left',
        renderStyle: 'plain',
        aisleSize: 2,
        posX: Math.min(85, 15 + nextIndex * 18),
        posY: 30 + (nextIndex % 2) * 28
      });
      setActiveZoneIndex(nextIndex);
      return next;
    });
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
        navigate('/admin/dashboard');
      } else {
        const result = await eventService.createEvent({ ...payload, banner_url: banner_url || null });
        const createdId = result?.event_id;
        if (createdId) {
          navigate(`/events/${createdId}?hl=created`, { replace: false });
        }
      }
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
      <div className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="text-sm text-muted">Đang tải dữ liệu sự kiện...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <h1 className="text-lg font-semibold">{isEdit ? 'Sửa sự kiện' : 'Tạo sự kiện'}</h1>
        <div className="mt-1 text-sm text-muted">Thiết lập seating plan theo zones + layout</div>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">{error}</div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input label="Tên sự kiện" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Rock Night 2026" />
          <label className="block">
            <div className="mb-1 text-sm text-muted">Thể loại</div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
            >
              <option value="">-- Chọn thể loại --</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </label>
          <Input
            label="Thời gian bắt đầu"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />

          <Input
            className="md:col-span-2"
            label="Mô tả"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn về sự kiện"
          />

          <label className="block">
            <div className="mb-1 text-sm text-muted">Banner sự kiện (tuỳ chọn)</div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
              className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text file:mr-3 file:rounded-md file:border-0 file:bg-bg/60 file:px-3 file:py-2 file:text-sm file:text-text hover:file:bg-bg/70 focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
            />
            {(bannerPreview || existingBannerUrl) && (
              <div className="mt-2 overflow-hidden rounded-xl border border-text/10 bg-bg/40">
                <img
                  src={bannerPreview || existingBannerUrl}
                  alt="banner preview"
                  className="h-32 w-full object-cover"
                />
              </div>
            )}
          </label>

          <Input
            label="Thời gian kết thúc"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4"
            />
            Publish ngay (is_published)
          </label>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4"
            />
            Đưa lên Banner Trang chủ
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-text/10 bg-bg/40 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Zones</div>
              <Button variant="secondary" size="sm" onClick={addZone}>Thêm zone</Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {zones.map((z, idx) => (
                <button
                  key={z.key}
                  type="button"
                  onClick={() => setActiveZoneIndex(idx)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    idx === activeZoneIndex
                      ? 'border-brand-600/60 bg-brand-600/15 text-text'
                      : 'border-text/10 bg-bg/30 text-muted hover:bg-text/5 hover:text-text'
                  }`}
                >
                  <div className="font-semibold">{z.name || `Zone ${idx + 1}`}</div>
                  <div className="text-xs">{formatVND(Number(z.price) || 0)}</div>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-text/10 bg-bg/30 p-3">
              <div className="text-xs font-semibold text-muted">Sơ đồ zones (kéo thả để di chuyển)</div>
              <div className="mt-3 overflow-hidden rounded-xl border border-text/10 bg-bg/40">
                <div ref={placementRef} className="relative h-44">
                  <div className="absolute left-3 right-3 top-3 flex items-center justify-center">
                    <div className="h-2 w-3/5 rounded-full bg-brand-600/40" aria-hidden="true" />
                  </div>

                  {zones.map((z, idx) => (
                    <button
                      key={`zone-pos-${z.key}`}
                      type="button"
                      onClick={() => setActiveZoneIndex(idx)}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        const originX = Number(z.posX) || 0;
                        const originY = Number(z.posY) || 0;
                        setDragging({ zoneIndex: idx, startX: e.clientX, startY: e.clientY, originX, originY });
                      }}
                      className={`absolute w-32 select-none rounded-xl border px-3 py-2 text-left text-xs transition active:cursor-grabbing ${
                        idx === activeZoneIndex
                          ? 'border-brand-600/60 bg-brand-600/15 text-text'
                          : 'border-text/10 bg-surface text-muted hover:bg-text/5 hover:text-text'
                      }`}
                      style={{ left: `${Math.max(0, Math.min(100, Number(z.posX) || 0))}%`, top: `${Math.max(0, Math.min(100, Number(z.posY) || 0))}%`, transform: 'translate(-50%, -50%)' }}
                      title="Kéo để di chuyển"
                    >
                      <div className="font-semibold leading-tight">{z.name || `Zone ${idx + 1}`}</div>
                      <div className="mt-0.5 text-[10px] text-muted">{formatVND(Number(z.price) || 0)}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-muted">Vị trí zone sẽ hiển thị cho khách ở trang chọn ghế.</div>
            </div>

            {activeZone && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input label="Tên zone" value={activeZone.name} onChange={(e) => setZoneField(activeZoneIndex, { name: e.target.value })} />
                <Input
                  label="Giá (VND)"
                  type="number"
                  value={activeZone.price}
                  onChange={(e) => setZoneField(activeZoneIndex, { price: e.target.value })}
                />

                <label className="block md:col-span-2">
                  <div className="mb-1 text-sm text-muted">Layout</div>
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
                    <option value="grid">Grid (đều)</option>
                    <option value="tapered">Tapered (to/nhỏ theo hàng)</option>
                    <option value="custom">Custom (số ghế từng hàng)</option>
                  </select>
                </label>

                {(activeZone.layout === 'grid' || activeZone.layout === 'tapered') && (
                  <Input
                    label="Total rows"
                    type="number"
                    value={activeZone.totalRows}
                    onChange={(e) => setZoneField(activeZoneIndex, { totalRows: e.target.value })}
                  />
                )}

                {activeZone.layout === 'grid' && (
                  <Input
                    label="Seats/row"
                    type="number"
                    value={activeZone.seatsPerRow}
                    onChange={(e) => setZoneField(activeZoneIndex, { seatsPerRow: e.target.value })}
                  />
                )}

                {activeZone.layout === 'tapered' && (
                  <>
                    <Input
                      label="Seats row (start)"
                      type="number"
                      value={activeZone.taperedStart}
                      onChange={(e) => setZoneField(activeZoneIndex, { taperedStart: e.target.value })}
                    />
                    <Input
                      label="Seats row (end)"
                      type="number"
                      value={activeZone.taperedEnd}
                      onChange={(e) => setZoneField(activeZoneIndex, { taperedEnd: e.target.value })}
                    />
                  </>
                )}

                {activeZone.layout === 'custom' && (
                  <label className="block md:col-span-2">
                    <div className="mb-1 text-sm text-muted">Row seat counts</div>
                    <textarea
                      value={activeZone.customCounts}
                      onChange={(e) => setZoneField(activeZoneIndex, { customCounts: e.target.value })}
                      placeholder="VD: 12,12,14,14,16,16"
                      rows={3}
                      className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/70 focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
                    />
                    <div className="mt-1 text-xs text-muted">Nhập số ghế theo từng hàng, phân tách bằng dấu phẩy hoặc xuống dòng.</div>
                  </label>
                )}

                <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
                  {activeZone.layout !== 'grid' && (
                    <label className="block">
                      <div className="mb-1 text-sm text-muted">Căn ghế</div>
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

                  <label className="block md:col-span-2">
                    <div className="mb-1 text-sm text-muted">Kiểu hiển thị (block / lối đi)</div>
                    <select
                      value={activeZone.renderStyle || 'plain'}
                      onChange={(e) => setZoneField(activeZoneIndex, { renderStyle: e.target.value })}
                      className="w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text focus:border-brand-600/50 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
                    >
                      <option value="plain">Plain (không chia block)</option>
                      <option value="center_aisle">Chia 2 block (lối đi giữa)</option>
                      <option value="three_blocks">Box sections (3 block)</option>
                    </select>
                  </label>

                  {activeZone.renderStyle && activeZone.renderStyle !== 'plain' && (
                    <Input
                      label="Độ rộng lối đi (cột trống)"
                      type="number"
                      value={activeZone.aisleSize ?? 2}
                      onChange={(e) => setZoneField(activeZoneIndex, { aisleSize: e.target.value })}
                    />
                  )}
                </div>

                <div className="md:col-span-2 flex items-center justify-between">
                  <div className="text-xs text-muted">Tổng ghế (zone đang chọn): {totalSeatsInActiveZone}</div>
                  <Button variant="secondary" size="sm" onClick={removeActiveZone} disabled={zones.length <= 1}>
                    Xoá zone
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-text/10 bg-bg/40 p-4">
            <div className="text-sm font-semibold">Preview seating plan</div>
            <div className="mt-4 overflow-auto rounded-xl border border-text/10 bg-bg/30 p-3">
              {preview.rows.length === 0 ? (
                <div className="text-sm text-muted">Chưa có dữ liệu preview.</div>
              ) : (
                <div className="space-y-3">
                  {preview.rows.map((row) => (
                    <div key={row.rowLabel} className="flex items-center gap-3">
                      <div className="w-6 text-xs font-semibold text-muted">{row.rowLabel}</div>
                      {(() => {
                        const built = buildRowCells(row.seats, preview.maxSeatCount, previewLayoutMeta);
                        return (
                          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${built.cols}, minmax(0, 1fr))` }}>
                            {built.cells.map((s, idx) => {
                              if (!s) return <div key={`${row.rowLabel}-empty-${idx}`} className="h-8 w-8 rounded-md bg-text/5" />;
                              return <Seat key={s.seat_id} seat={s} selected={false} onClick={() => {}} />;
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 text-xs text-muted">Preview chỉ để admin cân chỉnh layout theo zone.</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-muted">{isEdit ? 'Lưu thay đổi hoặc xoá sự kiện.' : 'Tạo sự kiện trên backend (cần đăng nhập ADMIN).'} </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))}>
              Copy Payload JSON
            </Button>
            {isEdit && (
              <Button variant="danger" onClick={handleDelete} disabled={submitting}>
                Xoá
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (isEdit ? 'Đang lưu...' : 'Đang tạo...') : isEdit ? 'Lưu thay đổi' : 'Tạo trên backend'}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="text-sm font-semibold">Dữ liệu sinh ra</div>
        <pre className="mt-3 overflow-auto rounded-xl border border-text/10 bg-bg/40 p-4 text-xs text-muted">
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
