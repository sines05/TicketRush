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
import stats from '../../services/mock/stats.json';
import eventService from '../../services/eventService.js';
import { formatVND } from '../../utils/formatters.js';
import Button from '../../components/common/Button.jsx';

const GENDER_COLORS = {
  MALE: 'rgb(var(--tr-brand-600))',
  FEMALE: 'rgb(var(--tr-success))',
  OTHER: 'rgb(var(--tr-warning))'
};

export default function Dashboard() {
  const genderData = Object.entries(stats.demographics.gender).map(([name, value]) => ({ name, value }));
  const ageData = Object.entries(stats.demographics.age_groups).map(([name, value]) => ({ name, value }));

  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [events, setEvents] = useState([]);

  async function loadEvents() {
    setEventsLoading(true);
    setEventsError('');
    try {
      const data = await eventService.getAdminEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      setEventsError(e?.message || 'Không tải được danh sách sự kiện');
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

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

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
            <div className="mt-1 text-sm text-muted">Biểu đồ demo (data mock)</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <KpiCard label="Doanh thu" value={formatVND(stats.total_revenue)} />
          <KpiCard label="Vé đã bán" value={stats.total_tickets_sold} />
          <KpiCard label="Fill rate" value={`${stats.fill_rate_percentage}%`} />
          <KpiCard label="Demo" value={'v1.0.0'} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-text/10 bg-surface p-5">
          <div className="text-sm font-semibold">Demographics • Gender</div>
          <div className="mt-4 h-72">
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
          </div>
        </div>

        <div className="rounded-2xl border border-text/10 bg-surface p-5">
          <div className="text-sm font-semibold">Demographics • Age groups</div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill={'rgb(var(--tr-brand-600))'} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="text-sm font-semibold">Ghi chú</div>
        <div className="mt-2 text-sm text-muted">
          Dashboard dùng Recharts để demo biểu đồ tròn/cột theo API 5.2 (demographics).
        </div>
      </section>

      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Sự kiện</div>
            <div className="mt-1 text-sm text-muted">Quản lý sự kiện (Sửa / Xoá)</div>
          </div>
          <Link to="/admin/events/new">
            <Button>Tạo sự kiện</Button>
          </Link>
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
