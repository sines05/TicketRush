import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  LayoutDashboard, 
  Users, 
  TicketCheck, 
  PlusCircle, 
  TrendingUp, 
  Users2, 
  Calendar,
  Edit,
  MessageSquareWarning,
  Trash2,
  ExternalLink,
  Megaphone
} from 'lucide-react';

const GENDER_COLORS = {
  MALE: 'hsl(var(--tr-chart-1))',
  FEMALE: 'hsl(var(--tr-chart-4))',
  OTHER: 'hsl(var(--tr-chart-3))'
};

const AGE_COLORS = [
  'hsl(var(--tr-chart-1))',
  'hsl(var(--tr-chart-2))',
  'hsl(var(--tr-chart-3))'
];

const AGE_GROUP_ORDER = ['18-24', '25-34', '35+'];

const chartTooltipProps = {
  contentStyle: {
    borderRadius: '12px',
    border: '1px solid hsl(var(--tr-border))',
    background: 'hsl(var(--tr-card) / 0.96)',
    color: 'hsl(var(--tr-card-foreground))',
    boxShadow: '0 18px 44px -28px hsl(var(--tr-chart-1) / 0.55)'
  },
  labelStyle: {
    color: 'hsl(var(--tr-card-foreground))',
    fontWeight: 700
  },
  itemStyle: {
    color: 'hsl(var(--tr-card-foreground))'
  }
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [eventToDelete, setEventToDelete] = useState(null);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: eventService.getAdminEvents,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats', selectedEventId],
    queryFn: () => eventService.getDashboardStats(selectedEventId === 'all' ? '' : selectedEventId),
    enabled: !!events || selectedEventId === 'all'
  });

  const deleteMutation = useMutation({
    mutationFn: eventService.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      setEventToDelete(null);
    }
  });

  const handleDelete = () => {
    if (eventToDelete) {
      deleteMutation.mutate(eventToDelete.id);
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
    <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-700">
      {/* Header & Quick Actions */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" /> Hệ thống Quản trị
          </h1>
          <p className="text-muted-foreground">Theo dõi hiệu suất và quản lý tài nguyên TicketRush.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to="/admin/complaints"><MessageSquareWarning className="mr-2 h-4 w-4" /> Các đơn khiếu nại</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/users"><Users className="mr-2 h-4 w-4" /> Quản lý User</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/check-in"><TicketCheck className="mr-2 h-4 w-4" /> Check-in vé</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/notifications"><Megaphone className="mr-2 h-4 w-4" /> Gửi thông báo</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/events/new"><PlusCircle className="mr-2 h-4 w-4" /> Tạo sự kiện mới</Link>
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="tr-dashboard-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <div className="rounded-xl bg-[hsl(var(--tr-chart-1)/0.14)] p-2 text-[hsl(var(--tr-chart-1))]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : formatVND(stats?.total_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">+20.1% so với tháng trước</p>
          </CardContent>
        </Card>
        <Card className="tr-dashboard-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vé đã bán</CardTitle>
            <div className="rounded-xl bg-[hsl(var(--tr-chart-2)/0.14)] p-2 text-[hsl(var(--tr-chart-2))]">
              <TicketCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.total_sold || 0}</div>
            <p className="text-xs text-muted-foreground">+180.1% so với tháng trước</p>
          </CardContent>
        </Card>
        <Card className="tr-dashboard-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỉ lệ lấp đầy</CardTitle>
            <div className="rounded-xl bg-[hsl(var(--tr-chart-3)/0.16)] p-2 text-[hsl(var(--tr-chart-3))]">
              <Users2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : `${((stats?.occupancy_rate || 0) * 100).toFixed(1)}%`}</div>
            <p className="text-xs text-muted-foreground">+19% so với tháng trước</p>
          </CardContent>
        </Card>
        <Card className="tr-dashboard-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sự kiện đang diễn ra</CardTitle>
            <div className="rounded-xl bg-[hsl(var(--tr-chart-5)/0.14)] p-2 text-[hsl(var(--tr-chart-5))]">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events?.filter(e => e.is_published).length || 0}</div>
            <p className="text-xs text-muted-foreground">Trên tổng số {events?.length || 0} sự kiện</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Charts */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="tr-dashboard-card lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Phân tích sự kiện</CardTitle>
              <CardDescription>Dữ liệu chi tiết theo từng sự kiện.</CardDescription>
            </div>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Chọn sự kiện" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả sự kiện</SelectItem>
                {events?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {statsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : ageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      {AGE_COLORS.map((color, index) => (
                        <linearGradient key={color} id={`ageGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.58} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid stroke="hsl(var(--tr-chart-grid) / 0.28)" strokeDasharray="4 6" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--tr-muted-foreground))' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--tr-muted-foreground))' }} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--tr-chart-1) / 0.08)' }}
                      contentStyle={{
                        ...chartTooltipProps.contentStyle,
                        boxShadow: '0 18px 44px -28px hsl(var(--tr-chart-1) / 0.55)'
                      }}
                      labelStyle={chartTooltipProps.labelStyle}
                      itemStyle={chartTooltipProps.itemStyle}
                    />
                    <Bar dataKey="value" radius={[10, 10, 4, 4]} barSize={42}>
                      {ageData.map((entry, index) => (
                        <Cell key={entry.name} fill={`url(#ageGradient-${index % AGE_COLORS.length})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic">Chưa có dữ liệu độ tuổi</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="tr-dashboard-card lg:col-span-3">
          <CardHeader>
            <CardTitle>Phân bố Giới tính</CardTitle>
            <CardDescription>Thành phần khán giả tham gia.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {statsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : genderData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={4}
                      cornerRadius={8}
                    >
                      {genderData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={GENDER_COLORS[entry.name] ?? 'hsl(var(--tr-chart-5))'}
                          stroke="hsl(var(--tr-card))"
                          strokeWidth={4}
                        />
                      ))}
                    </Pie>
                    <Legend
                      iconType="circle"
                      verticalAlign="bottom"
                      height={32}
                      formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                    />
                    <Tooltip 
                      contentStyle={{
                        ...chartTooltipProps.contentStyle,
                        boxShadow: '0 18px 44px -28px hsl(var(--tr-chart-4) / 0.5)'
                      }}
                      labelStyle={chartTooltipProps.labelStyle}
                      itemStyle={chartTooltipProps.itemStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic">Chưa có dữ liệu giới tính</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Danh sách Sự kiện</CardTitle>
            <CardDescription>Quản lý các sự kiện đã tạo trên hệ thống.</CardDescription>
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            Tổng cộng: {events?.length || 0}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sự kiện</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-40 animate-pulse bg-muted rounded"></div></TableCell>
                    <TableCell><div className="h-4 w-32 animate-pulse bg-muted rounded"></div></TableCell>
                    <TableCell><div className="h-4 w-16 animate-pulse bg-muted rounded"></div></TableCell>
                    <TableCell className="text-right"><div className="h-8 w-20 animate-pulse bg-muted rounded ml-auto"></div></TableCell>
                  </TableRow>
                ))
              ) : events?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Chưa có sự kiện nào được tạo.
                  </TableCell>
                </TableRow>
              ) : (
                events?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(e.start_time).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        e.is_published 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {e.is_published ? 'Công khai' : 'Bản nháp'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/events/${e.id}/edit`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setEventToDelete(e)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Xác nhận xóa sự kiện</DialogTitle>
                              <DialogDescription>
                                Bạn có chắc chắn muốn xóa sự kiện <strong>{eventToDelete?.title}</strong>? Hành động này không thể hoàn tác.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEventToDelete(null)}>Hủy</Button>
                              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                                {deleteMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/events/${e.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
