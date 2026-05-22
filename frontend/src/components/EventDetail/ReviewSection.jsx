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
    <section className="space-y-10 animate-fade-in-up">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-7 md:p-8 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-brand-600" />
          Đánh giá từ cộng đồng
        </h2>
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 px-6 py-3 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner">
          <span className="text-4xl font-black text-brand-600 tracking-tighter">
            {averageRating}
          </span>
          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-tight">
            <div>/ 5.0</div>
            <div className="text-slate-400 mt-1">{reviews?.length || 0} đánh giá</div>
          </div>
        </div>
      </div>

      <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
        {/* Review Form */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-white/60 dark:border-white/10 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] h-fit sticky top-24">
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-6 flex items-center gap-2">
            <div className="h-1.5 w-4 bg-brand-600/30 rounded-full" />
            Gửi đánh giá
          </h3>
          <form onSubmit={handleReviewSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-[0.2em]">Cảm nhận của bạn</label>
              <div className="flex gap-2 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 justify-center">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className={`text-3xl transition-all hover:scale-110 active:scale-90 ${
                      s <= rating ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'text-slate-200 dark:text-white/10'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-[0.2em]">Bình luận chi tiết</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn..."
                className="w-full rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-5 py-4 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-600/50 focus:ring-4 focus:ring-brand-600/10 transition-all shadow-inner"
                rows="5"
                required
              />
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-600/20" disabled={reviewMutation.isPending}>
              {reviewMutation.isPending ? (
                 <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Đang gửi...
                 </span>
              ) : 'Gửi đánh giá ngay'}
            </Button>
          </form>
        </div>

        {/* Review List */}
        <div className="space-y-6">
          {reviewsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/30 dark:bg-white/5 rounded-[32px] border border-dashed border-slate-200">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600/20 border-t-brand-600" />
              <p className="mt-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Đang tải đánh giá...</p>
            </div>
          ) : reviews?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/30 dark:bg-white/5 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-white/5 text-center">
              <div className="h-16 w-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Chưa có đánh giá nào</p>
              <p className="text-xs text-slate-400 mt-2">Hãy là người đầu tiên chia sẻ cảm nhận!</p>
            </div>
          ) : (
            reviews?.map((r) => (
              <div key={r.id} className="bg-white dark:bg-slate-900 rounded-[32px] border border-white/60 dark:border-white/10 p-7 shadow-[0_15px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all group">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-600 to-emerald-400 flex items-center justify-center text-white font-black text-xs shadow-md">
                      {(r.user?.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-black text-slate-900 dark:text-white text-sm tracking-tight">{r.user?.full_name || 'Người dùng TicketRush'}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{formatDateTime(r.created_at)}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-slate-100 dark:border-white/5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`text-xs ${i < r.rating ? 'text-amber-400' : 'text-slate-200 dark:text-white/5'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pl-13">
                   <p className="text-base font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                     "{r.comment}"
                   </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ReviewSection;
