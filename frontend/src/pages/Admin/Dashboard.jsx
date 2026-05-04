import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import eventService from '../../services/eventService.js';
import { formatVND } from '../../utils/formatters.js';
import Button from '../../components/common/Button.jsx';

const GENDER_COLORS = {
  MALE: 'rgb(var(--tr-brand-600))',
  FEMALE: 'rgb(var(--tr-success))',
  OTHER: 'rgb(var(--tr-warning))'
};

const AGE_GROUP_ORDER = ['18-24', '25-34', '35+'];

export default function Dashboard() {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [events, setEvents] = useState([]);

  const [dashboardStats, setDashboardStats] = useState({
    total_revenue: 0,
    total_sold: 0,
    occupancy_rate: 0,
    gender_dist: [],
    age_dist: {}
  });

  async function loadEvents() {
    setEventsLoading(true);
    setEventsError('');
    try {
      const data = await eventService.getAdminEvents();
      setEvents(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch (e) {
      setEventsError(e?.message || 'Không tải được danh sách sự kiện');
    } finally {
      setEventsLoading(false);
    }
  }

  async function loadDashboardStats(eventId) {
    setStatsLoading(true);
    setStatsError('');
    try {
      const data = await eventService.getDashboardStats(eventId);
      setDashboardStats(data || {
        total_revenue: 0,
        total_sold: 0,
        occupancy_rate: 0,
        gender_dist: [],
        age_dist: {}
      });
    } catch (e) {
      setStatsError(e?.message || 'Không tải được thống kê');
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadDashboardStats(selectedEventId);
    }
  }, [selectedEventId]);

  async function handleDelete(eventId) {
    if (!eventId) return;
    const ok = window.confirm('Xoá sự kiện này?');
    if (!ok) return;

    try {
      await eventService.deleteEvent(eventId);
      await loadEvents();
    } catch (e) {
      setEventsError(e?.message || 'Xoá sự kiện thất bại');
    }
  }

  // Transform gender_dist từ API format sang recharts format
  const genderData = dashboardStats.gender_dist?.map((item) => ({
    name: item.gender || item.name,
    value: item.count || item.value
  })) || [];

  // Transform age_dist từ API format sang recharts format
  const ageData = dashboardStats.age_dist
    ? AGE_GROUP_ORDER.map((group) => ({
        name: group,
        value: dashboardStats.age_dist[group] || 0
      }))
    : [];

  const currentEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
            <div className="mt-1 text-sm text-muted">Thống kê theo sự kiện</div>
          </div>
        </div>

        {statsError && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">{statsError}</div>
        )}

        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <label className="text-sm font-semibold">Chọn sự kiện</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-text/20 bg-bg px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10 md:w-auto"
            >
              <option value="">-- Tất cả sự kiện --</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <KpiCard label="Doanh thu" value={statsLoading ? '...' : formatVND(dashboardStats.total_revenue)} />
          <KpiCard label="Vé đã bán" value={statsLoading ? '...' : dashboardStats.total_sold} />
          <KpiCard label="Fill rate" value={statsLoading ? '...' : `${(dashboardStats.occupancy_rate * 100).toFixed(1)}%`} />
          <KpiCard label="Sự kiện" value={currentEvent?.title || '—'} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-text/10 bg-surface p-5">
          <div className="text-sm font-semibold">Demographics • Gender</div>
          <div className="mt-4 h-72">
            {statsLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-muted">Đang tải...</div>
            ) : genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                    {genderData.map((entry) => (
                      <Cell key={entry.name} fill={GENDER_COLORS[entry.name] ?? 'rgb(var(--tr-muted))'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted">Chưa có dữ liệu</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-text/10 bg-surface p-5">
          <div className="text-sm font-semibold">Demographics • Age groups</div>
          <div className="mt-4 h-72">
            {statsLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-muted">Đang tải...</div>
            ) : ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="value" fill={'rgb(var(--tr-brand-600))'} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted">Chưa có dữ liệu</div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="text-sm font-semibold">Ghi chú</div>
        <div className="mt-2 text-sm text-muted">
          Dashboard lấy dữ liệu demographic từ API thực. Chọn sự kiện để xem thống kê chi tiết.
        </div>
      </section>

      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Sự kiện</div>
            <div className="mt-1 text-sm text-muted">Quản lý sự kiện (Sửa / Xoá)</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/check-in">
              <Button variant="secondary">Check-in vé</Button>
            </Link>
            <Link to="/admin/events/new">
              <Button>Tạo sự kiện</Button>
            </Link>
          </div>
        </div>

        {eventsError && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">{eventsError}</div>
        )}

        <div className="mt-4 space-y-3">
          {eventsLoading ? (
            <div className="text-sm text-muted">Đang tải...</div>
          ) : events.length === 0 ? (
            <div className="text-sm text-muted">Chưa có sự kiện nào.</div>
          ) : (
            events.map((e) => (
              <div
                key={e.id}
                className="flex flex-col gap-3 rounded-xl border border-text/10 bg-bg/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold">{e.title}</div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        e.is_published
                          ? 'border-success/30 bg-success/15 text-success'
                          : 'border-warning/30 bg-warning/15 text-warning'
                      }`}
                    >
                      {e.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted">{e.start_time ? new Date(e.start_time).toLocaleString('vi-VN') : '—'}</div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link to={`/admin/events/${e.id}/edit`}>
                    <Button variant="secondary" size="sm">Sửa</Button>
                  </Link>
                  <Button variant="secondary" size="sm" onClick={() => handleDelete(e.id)}>
                    Xoá
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-xl border border-text/10 bg-bg/40 p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
