import React from 'react';
import Button from '../common/Button.jsx';
import { formatDateTime } from '../../utils/formatters.js';

const ReviewSection = ({ 
  reviews, 
  reviewsLoading, 
  reviewMutation, 
  handleReviewSubmit, 
  rating, 
  setRating, 
  comment, 
  setComment 
}) => {
  const averageRating = reviews?.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <section className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brand-600">Đánh giá từ cộng đồng</h2>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-brand-600">
            {averageRating}
          </span>
          <div className="text-xs text-muted-foreground">
            <div className="font-bold">/ 5.0</div>
            <div>{reviews?.length || 0} đánh giá</div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
        {/* Review Form */}
        <div className="bg-surface/50 rounded-2xl glass-border p-6 h-fit">
          <h3 className="text-lg font-bold mb-4">Gửi đánh giá</h3>
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-2 uppercase tracking-wider font-bold">Xếp hạng</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className={`text-2xl transition-colors ${
                      s <= rating ? 'text-warning' : 'text-white/10'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2 uppercase tracking-wider font-bold">Bình luận</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn..."
                className="w-full rounded-xl glass-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-600 transition-colors"
                rows="4"
                required
              />
            </div>
            <Button type="submit" className="w-full py-4" disabled={reviewMutation.isPending}>
              {reviewMutation.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Button>
          </form>
        </div>

        {/* Review List */}
        <div className="space-y-4">
          {reviewsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Đang tải đánh giá...</div>
          ) : reviews?.length === 0 ? (
            <div className="text-center py-12 border-dashed glass-border rounded-2xl text-muted-foreground italic">
              Chưa có đánh giá nào cho sự kiện này.
            </div>
          ) : (
            reviews?.map((r) => (
              <div key={r.id} className="bg-surface/30 rounded-2xl glass-border p-6 transition-colors hover:bg-surface/40">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-sm">{r.user?.full_name || 'Người dùng TicketRush'}</div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</div>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${i < r.rating ? 'text-warning' : 'text-white/5'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ReviewSection;
