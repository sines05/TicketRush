import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/common/Button.jsx';
import Loading from '../../components/common/Loading.jsx';
import eventService from '../../services/eventService.js';
import feedbackService from '../../services/feedbackService.js';
import { formatDateTime, formatVND } from '../../utils/formatters.js';
import bannerFallback from '../../assets/banner-sample.svg';
import { resolveMediaUrl } from '../../utils/media.js';
import GoogleMapLocation from '../../components/Maps/GoogleMapLocation';
import { useAuth } from '../../hooks/useAuth.js';

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [error, setError] = useState('');

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const highlight = searchParams.get('hl');

  useEffect(() => {
    let mounted = true;

    Promise.all([eventService.getEventDetail(slug), eventService.getSeatMap(slug)])
      .then(([evt, sm]) => {
        if (!mounted) return;
        setEvent(evt);
        setSeatMap(sm);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Không tải được thông tin sự kiện');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', event?.id],
    queryFn: () => feedbackService.getReviews(event?.id),
    enabled: !!event?.id
  });

  const reviewMutation = useMutation({
    mutationFn: feedbackService.submitReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', event?.id] });
      setComment('');
      setRating(5);
    }
  });

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth/login');
      return;
    }
    reviewMutation.mutate({ event_id: event.id, rating, comment });
  };

  const minPrice = useMemo(() => {
    const prices = seatMap?.zones?.map((z) => z.price).filter(Boolean) ?? [];
    return prices.length ? Math.min(...prices) : null;
  }, [seatMap]);

  if (loading) return <Loading title="Đang tải chi tiết..." />;

  if (!event) {
    return (
      <div className="rounded-xl border border-text/10 bg-surface p-5">
        <div className="text-sm">Không tìm thấy sự kiện.</div>
        <div className="mt-3">
          <Link to="/">
            <Button variant="secondary">Về trang chủ</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm">{error}</div>
      )}

      <section className="overflow-hidden rounded-2xl border border-text/10 bg-surface">
        <div className="grid md:grid-cols-[1.6fr_1fr]">
          <div className="relative">
            <img
              src={resolveMediaUrl(event.banner_url) || bannerFallback}
              alt={event.title}
              className="h-64 w-full object-cover md:h-[19rem]"
              loading="lazy"
            />
          </div>

          <div className="relative p-5">
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden border-l border-dashed border-text/20 md:block" />
            <div className="pointer-events-none absolute -left-3 top-10 hidden h-6 w-6 rounded-full border border-text/10 bg-bg md:block" />
            <div className="pointer-events-none absolute -left-3 bottom-10 hidden h-6 w-6 rounded-full border border-text/10 bg-bg md:block" />

            <div className="space-y-4 md:pl-3">
              <div>
                <h1 className="text-lg font-semibold">{event.title}</h1>
                <div className="mt-1 text-sm text-muted">{formatDateTime(event.start_time)}</div>
                <div className="mt-1 text-sm text-muted flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.location}
                </div>
                {highlight && <div className="mt-2 text-xs text-warning">Highlight: {highlight}</div>}
              </div>

              <p className="text-sm text-muted">{event.description}</p>

              <div className="rounded-xl border border-text/10 bg-bg/40 p-4">
                <div className="text-xs text-muted">Giá từ</div>
                <div className="mt-1 text-base font-semibold">{minPrice ? formatVND(minPrice) : '—'}</div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate(-1)}>
                  Quay lại
                </Button>
                <Button onClick={() => navigate(`/booking/queue?eventId=${event.id}`)}>Mua vé</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-text/10 bg-surface p-5 md:col-span-2">
          <div className="text-sm font-semibold">Khu vực & giá</div>
          <div className="mt-4 space-y-3">
            {(seatMap?.zones ?? []).map((z) => (
              <div
                key={z.zone_id}
                className="flex items-center justify-between rounded-xl border border-text/10 bg-bg/40 p-3 transition hover:border-brand-600/35 hover:ring-2 hover:ring-brand-600/10"
              >
                <div>
                  <div className="text-sm font-semibold">{z.name}</div>
                  <div className="mt-1 text-xs text-muted">Sơ đồ ghế theo hàng/cột</div>
                </div>
                <div className="text-sm font-semibold">{formatVND(z.price)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-text/10 bg-surface p-5">
          <div className="text-sm font-semibold">Flow đặt vé</div>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-muted">
            <li>Vào hàng chờ ảo (Virtual Queue)</li>
            <li>Chọn ghế (SeatMap)</li>
            <li>Thanh toán (Checkout) + đếm ngược 10 phút</li>
            <li>Nhận vé QR Code</li>
          </ol>
          <div className="mt-4">
            <Button className="w-full" onClick={() => navigate(`/booking/queue?eventId=${event.id}`)}>
              Bắt đầu
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-text/10 bg-surface p-5 md:col-span-2">
          <div className="text-sm font-semibold">Địa điểm</div>
          <div className="mt-3 text-sm text-muted mb-4">{event.address || event.location}</div>
          <div className="h-[400px] w-full overflow-hidden rounded-xl border border-text/10">
            <GoogleMapLocation
              initialLocation={{ lat: event.latitude, lng: event.longitude }}
              readOnly={true}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-text/10 bg-surface p-5">
          <div className="text-sm font-semibold">Sản phẩm liên quan</div>
          <div className="mt-3 space-y-3">
            {(seatMap?.zones ?? []).slice(0, 3).map((z) => (
              <div key={z.zone_id} className="rounded-xl border border-text/10 bg-bg/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Gói {z.name}</div>
                    <div className="mt-1 text-xs text-muted">Phù hợp nếu bạn thích khu vực {z.name}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatVND(z.price)}</div>
                </div>
              </div>
            ))}
            {(seatMap?.zones ?? []).length === 0 && (
              <div className="text-sm text-muted">Chưa có thông tin gói vé.</div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-text/10 bg-surface p-5">
        <div className="text-sm font-semibold">Giới thiệu</div>
        <div className="mt-3 space-y-3 text-sm text-muted">
          <p>
            {event.description || 'Sự kiện này hiện chưa có mô tả chi tiết. Bạn có thể xem khu vực & giá và đặt vé ngay bên dưới.'}
          </p>
          <div className="rounded-xl border border-text/10 bg-bg/40 p-4">
            <div className="text-sm font-semibold text-text">Bạn sẽ nhận được gì?</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Vé QR Code để check-in nhanh</li>
              <li>Giữ chỗ 10 phút trong bước thanh toán</li>
              <li>Chọn ghế trực tiếp theo khu vực</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Đánh giá từ cộng đồng</h2>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-brand-600">
              {reviews?.length > 0
                ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                : '0.0'}
            </span>
            <div className="text-xs text-muted">
              <div>/ 5.0</div>
              <div>{reviews?.length || 0} đánh giá</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
          <div className="rounded-2xl border border-text/10 bg-surface p-5 h-fit">
            <h3 className="text-sm font-semibold mb-4">Gửi đánh giá của bạn</h3>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted block mb-1">Xếp hạng</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className={`text-xl transition-colors ${
                        s <= rating ? 'text-warning' : 'text-text/10'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Bình luận</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  className="w-full rounded-xl border border-text/10 bg-bg px-3 py-2 text-sm outline-none focus:border-brand-600"
                  rows="3"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={reviewMutation.isPending}>
                {reviewMutation.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
              </Button>
            </form>
          </div>

          <div className="space-y-4">
            {reviewsLoading ? (
              <div className="text-center py-10 text-muted">Đang tải đánh giá...</div>
            ) : reviews?.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-text/10 rounded-2xl text-muted">
                Chưa có đánh giá nào cho sự kiện này.
              </div>
            ) : (
              reviews?.map((r) => (
                <div key={r.id} className="rounded-2xl border border-text/10 bg-surface p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">{r.user_name || 'Người dùng TicketRush'}</div>
                    <div className="text-xs text-muted">{formatDateTime(r.created_at)}</div>
                  </div>
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`text-xs ${i < r.rating ? 'text-warning' : 'text-text/10'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-muted/90">{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
