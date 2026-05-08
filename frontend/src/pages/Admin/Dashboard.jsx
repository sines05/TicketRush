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
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState('');

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: eventService.getAdminEvents,
    onSuccess: (data) => {
      if (data && data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    }
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats', selectedEventId],
    queryFn: () => eventService.getDashboardStats(selectedEventId),
    enabled: !!selectedEventId || selectedEventId === ''
  });

  const deleteMutation = useMutation({
    mutationFn: eventService.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    }
  });

  const handleDelete = (eventId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) {
      deleteMutation.mutate(eventId);
    }
  };

  const genderData = stats?.gender_dist?.map((item) => ({
    name: item.gender || item.name,
    value: item.count || item.value
  })) || [];

  const ageData = stats?.age_dist
    ? AGE_GROUP_ORDER.map((group) => ({
        name: group,
        value: stats.age_dist[group] || 0
      }))
    : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Quick Actions */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Hệ thống Quản trị</h1>
          <p className="mt-1 text-sm text-muted">Theo dõi hiệu suất và quản lý tài nguyên TicketRush.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/users">
            <Button variant="secondary" className="bg-surface/50 backdrop-blur-sm border-text/10">Quản lý User</Button>
          </Link>
          <Link to="/admin/check-in">
            <Button variant="secondary" className="bg-surface/50 backdrop-blur-sm border-text/10">Check-in vé</Button>
          </Link>
          <Link to="/admin/events/new">
            <Button className="shadow-lg shadow-brand-600/20">Tạo sự kiện mới</Button>
          </Link>
        </div>
      </section>

      {/* KPI & Stats Selection */}
      <section className="rounded-3xl border border-text/10 bg-surface/50 backdrop-blur-xl p-8 shadow-2xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted">Lọc theo sự kiện</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="block w-full rounded-xl border border-text/10 bg-bg px-4 py-3 text-sm font-medium outline-none transition-all focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 md:w-80 cursor-pointer"
            >
              <option value="">Tất cả sự kiện</option>
              {events?.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:flex lg:gap-8">
            <KpiItem label="Doanh thu" value={statsLoading ? '...' : formatVND(stats?.total_revenue || 0)} highlight />
            <KpiItem label="Vé đã bán" value={statsLoading ? '...' : stats?.total_sold || 0} />
            <KpiItem label="Tỉ lệ lấp đầy" value={statsLoading ? '...' : `${((stats?.occupancy_rate || 0) * 100).toFixed(1)}%`} />
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Phân bố Giới tính" subtitle="Thống kê khán giả tham gia">
          <div className="h-72">
            {statsLoading ? (
              <LoadingSpinner />
            ) : genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={5}>
                    {genderData.map((entry) => (
                      <Cell key={entry.name} fill={GENDER_COLORS[entry.name] ?? 'rgb(var(--tr-muted))'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </div>
        </ChartCard>

        <ChartCard title="Nhóm tuổi" subtitle="Độ tuổi quan tâm đến sự kiện">
          <div className="h-72">
            {statsLoading ? (
              <LoadingSpinner />
            ) : ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'rgb(var(--tr-muted))' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'rgb(var(--tr-muted))' }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(var(--tr-brand-600), 0.05)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="rgb(var(--tr-brand-600))" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </div>
        </ChartCard>
      </section>

      {/* Events List Table-like UI */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Danh sách Sự kiện</h2>
          <span className="text-xs text-muted font-medium uppercase tracking-wider">{events?.length || 0} Sự kiện</span>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eventsLoading ? (
             Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface border border-text/10"></div>
            ))
          ) : events?.map((e) => (
            <div key={e.id} className="group relative overflow-hidden rounded-2xl border border-text/10 bg-surface/30 p-5 transition-all hover:bg-surface/80 hover:shadow-xl hover:-translate-y-1">
              <div className="flex justify-between items-start">
                <div className="space-y-1 pr-8">
                  <h3 className="font-bold text-text truncate group-hover:text-brand-600 transition-colors">{e.title}</h3>
                  <p className="text-xs text-muted">{new Date(e.start_time).toLocaleString('vi-VN')}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${e.is_published ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                  {e.is_published ? 'Live' : 'Draft'}
                </span>
              </div>
              
              <div className="mt-6 flex gap-2">
                <Link to={`/admin/events/${e.id}/edit`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full text-[11px] h-8 bg-bg">Sửa</Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 text-[11px] h-8 hover:bg-danger/10 hover:text-danger"
                  onClick={() => handleDelete(e.id)}
                >
                  Xóa
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function KpiItem({ label, value, highlight }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</div>
      <div className={`text-xl font-black ${highlight ? 'text-brand-600 dark:text-brand-400' : 'text-text'}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-text/10 bg-surface p-6 shadow-lg">
      <div className="mb-6">
        <h3 className="font-bold text-text">{title}</h3>
        <p className="text-xs text-muted mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-sm text-muted italic">Chưa có dữ liệu thống kê</div>
  );
}
