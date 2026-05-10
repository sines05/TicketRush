import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import feedbackService from '../../services/feedbackService.js';
import Button from '../../components/common/Button.jsx';
import Loading from '../../components/common/Loading.jsx';
import { formatDateTime } from '../../utils/formatters.js';

export default function AdminComplaints() {
  const queryClient = useQueryClient();

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['admin', 'complaints'],
    queryFn: feedbackService.getAllComplaints
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => feedbackService.updateComplaintStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'complaints'] });
    },
    onError: (err) => {
      window.alert(err?.message || 'Không thể cập nhật trạng thái khiếu nại');
    }
  });

  const handleStatusChange = (id, currentStatus) => {
    const nextStatus = currentStatus === 'PENDING' ? 'RESOLVED' : 'PENDING';
    updateMutation.mutate({ id, status: nextStatus });
  };

  if (isLoading) return <Loading title="Đang tải danh sách khiếu nại..." />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text">Quản lý Khiếu nại</h1>
        <p className="text-sm text-muted">Xem và xử lý các phản hồi từ khách hàng.</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-text/10 bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg/50 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-6 py-4">Ngày gửi</th>
                <th className="px-6 py-4">Tiêu đề & Nội dung</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text/5">
              {complaints?.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-muted">
                    Chưa có khiếu nại nào được gửi.
                  </td>
                </tr>
              ) : (
                complaints?.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-text/5">
                    <td className="whitespace-nowrap px-6 py-4 text-muted">
                      {formatDateTime(c.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-text">{c.title}</div>
                      <div className="mt-1 max-w-md text-xs text-muted/80 line-clamp-2">
                        {c.content}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          c.status === 'RESOLVED'
                            ? 'border-success/30 bg-success/10 text-success'
                            : 'border-warning/30 bg-warning/10 text-warning'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(c.id, c.status)}
                        disabled={updateMutation.isPending}
                      >
                        {c.status === 'PENDING' ? 'Đánh dấu Đã giải quyết' : 'Đánh dấu Đang chờ'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
