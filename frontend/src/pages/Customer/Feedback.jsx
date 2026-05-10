import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import feedbackService from '../../services/feedbackService.js';
import Button from '../../components/common/Button.jsx';

export default function Feedback() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: complaints, isLoading: complaintsLoading } = useQuery({
    queryKey: ['feedback', 'complaints'],
    queryFn: feedbackService.getComplaints,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const complaintMutation = useMutation({
    mutationFn: feedbackService.submitComplaint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', 'complaints'] });
      setTitle('');
      setContent('');
      setShowForm(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !content) return;
    complaintMutation.mutate({ title, content });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Hỗ trợ & Khiếu nại</h1>
          <p className="text-muted text-sm mt-1">Chúng tôi luôn lắng nghe ý kiến của bạn để cải thiện dịch vụ.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Đóng form' : 'Gửi khiếu nại mới'}
        </Button>
      </header>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-text/10 bg-surface p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-300"
        >
          <div className="space-y-2">
            <label className="text-sm font-semibold">Tiêu đề</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vấn đề bạn đang gặp phải..."
              className="w-full rounded-xl border border-text/10 bg-bg px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Nội dung chi tiết</label>
            <textarea
              rows="4"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mô tả chi tiết để chúng tôi hỗ trợ tốt nhất..."
              className="w-full rounded-xl border border-text/10 bg-bg px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              required
            ></textarea>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={complaintMutation.isPending}>
              {complaintMutation.isPending ? 'Đang gửi...' : 'Xác nhận gửi'}
            </Button>
          </div>
        </form>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Lịch sử khiếu nại</h2>
        <div className="grid gap-4">
          {complaintsLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface border border-text/10"></div>
            ))
          ) : complaints?.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-text/10 rounded-2xl text-muted">
              Bạn chưa có khiếu nại nào.
            </div>
          ) : (
            complaints?.map((c) => (
              <div key={c.id} className="group relative overflow-hidden rounded-2xl border border-text/10 bg-surface p-6 transition-all hover:border-brand-600/30 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-semibold text-text group-hover:text-brand-600 transition-colors">{c.title}</div>
                    <div className="text-xs text-muted">{new Date(c.created_at).toLocaleDateString('vi-VN')}</div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                      c.status === 'RESOLVED'
                        ? 'border-success/30 bg-success/10 text-success'
                        : c.status === 'PENDING'
                        ? 'border-warning/30 bg-warning/10 text-warning'
                        : 'border-danger/30 bg-danger/10 text-danger'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="mt-4 text-sm text-muted/80 leading-relaxed">{c.content}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
