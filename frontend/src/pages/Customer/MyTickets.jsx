import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Loading from '../../components/common/Loading.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TicketItem from '../../components/tickets/TicketItem.jsx';
import ticketService from '../../services/ticketService.js';
import { Ticket, ArrowLeft, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function MyTickets() {
  const {
    data: tickets,
    isLoading: loading,
    error: queryError
  } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: ticketService.getMyTickets,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    select: (data) => (Array.isArray(data) ? data : [])
  });

  const error = queryError?.message || '';

  if (loading) return <Loading title="Đang tải vé của bạn..." />;

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vé của tôi</h1>
            <p className="text-muted-foreground">Danh sách vé bạn đã đặt và mã QR để check-in.</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/">Khám phá thêm sự kiện</Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && tickets.length === 0 && (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <CardTitle>Bạn chưa có vé nào</CardTitle>
              <CardDescription>Hãy chọn một sự kiện và đặt vé để thấy vé ở đây.</CardDescription>
            </div>
            <Button asChild>
              <Link to="/">Mua vé ngay</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {tickets.map((t) => (
          <TicketItem key={t.ticket_id} ticket={t} />
        ))}
      </div>
    </div>
  );
}
