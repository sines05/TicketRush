import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../../components/common/Loading.jsx';
import Button from '../../components/common/Button.jsx';
import TicketItem from '../../components/tickets/TicketItem.jsx';
import ticketService from '../../services/ticketService.js';

export default function MyTickets() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    ticketService
      .getMyTickets()
      .then((data) => {
        if (!mounted) return;
        setTickets(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Không tải được danh sách vé');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <Loading title="Đang tải vé của bạn..." />;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Vé của tôi</h1>
            <p className="mt-1 text-sm text-muted">Danh sách vé bạn đã đặt (QR Code)</p>
          </div>
          <Link to="/">
            <Button variant="secondary">Về sự kiện</Button>
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm">{error}</div>
      )}

      {!error && tickets.length === 0 && (
        <div className="rounded-2xl border border-text/10 bg-surface p-5">
          <div className="text-sm font-semibold">Bạn chưa có vé nào</div>
          <div className="mt-1 text-sm text-muted">Hãy chọn một sự kiện và đặt vé để thấy vé ở đây.</div>
          <div className="mt-4">
            <Link to="/">
              <Button>Mua vé</Button>
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tickets.map((t) => (
          <TicketItem key={t.ticket_id} ticket={t} />
        ))}
      </div>
    </div>
  );
}
