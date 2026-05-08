import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import membershipService from '../../services/membershipService.js';
import Button from '../../components/common/Button.jsx';

export default function Membership() {
  const queryClient = useQueryClient();

  const { data: membership, isLoading: memberLoading } = useQuery({
    queryKey: ['membership', 'me'],
    queryFn: membershipService.getMyMembership
  });

  const { data: tiers, isLoading: tiersLoading } = useQuery({
    queryKey: ['membership', 'tiers'],
    queryFn: membershipService.getTiers
  });

  const upgradeMutation = useMutation({
    mutationFn: membershipService.upgradeTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      window.alert('Nâng cấp hạng thành công!');
    },
    onError: (err) => {
      window.alert(err?.message || 'Nâng cấp thất bại');
    }
  });

  const currentTier = tiers?.find((t) => t.name === membership?.tier);
  const currentPriority = currentTier?.priority_level ?? -1;

  const handleUpgrade = (tierId, tierName) => {
    if (window.confirm(`Bạn có chắc chắn muốn nâng cấp lên hạng ${tierName}?`)) {
      upgradeMutation.mutate(tierId);
    }
  };

  const progress = membership ? (membership.points / membership.next_tier_points) * 100 : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <header className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-purple-400">
          Chương trình Thành viên
        </h1>
        <p className="text-muted text-lg max-w-2xl mx-auto">
          Tích lũy điểm từ mỗi tấm vé và thăng hạng để nhận những đặc quyền ưu tiên độc quyền.
        </p>
      </header>

      {/* Current Status Card */}
      <section className="relative overflow-hidden rounded-3xl border border-text/10 bg-surface p-8 shadow-2xl">
        {/* Background Glow */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-600/10 blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl"></div>

        <div className="relative grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <div>
              <div className="text-sm font-semibold uppercase tracking-widest text-muted">Hạng hiện tại</div>
              <div className="mt-2 text-5xl font-black italic tracking-tighter text-text">
                {memberLoading ? '...' : membership?.tier}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted">Tiến trình hạng tiếp theo</span>
                <span className="text-text">{membership?.points} / {membership?.next_tier_points} pts</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-text/5">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-indigo-600 transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted italic">
                Bạn cần thêm {membership?.next_tier_points - (membership?.points || 0)} điểm để thăng hạng.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200 animate-pulse"></div>
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-surface border border-text/10 text-4xl font-bold shadow-inner">
                {membership?.tier?.[0] || '—'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tiers Grid */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Các cấp bậc thành viên</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiersLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-surface border border-text/10"></div>
            ))
          ) : (
            tiers?.map((tier) => (
              <div
                key={tier.id}
                className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  membership?.tier === tier.name
                    ? 'border-brand-600/50 bg-brand-600/[0.03] ring-1 ring-brand-600/20'
                    : 'border-text/10 bg-surface'
                }`}
              >
                {membership?.tier === tier.name && (
                  <div className="absolute -right-6 -top-6 rounded-full bg-brand-600 px-8 py-8 text-white rotate-12">
                    <div className="mt-4 -rotate-12 text-[10px] font-bold uppercase tracking-tight">Active</div>
                  </div>
                )}
                <div className="text-lg font-bold">{tier.name}</div>
                <div className="mt-2 text-xs text-muted leading-relaxed">{tier.description}</div>
                <div className="mt-6 space-y-3">
                  <BenefitItem text="Ưu tiên xếp hàng" active={tier.priority_level >= 1} />
                  <BenefitItem text="Thông báo sớm" active={tier.priority_level >= 2} />
                  <BenefitItem text="Vào thẳng phòng vé" active={tier.priority_level >= 3} />
                </div>

                {tier.priority_level > currentPriority && (
                  <div className="mt-6">
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => handleUpgrade(tier.id, tier.name)}
                      loading={upgradeMutation.isPending}
                    >
                      Nâng cấp ngay
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function BenefitItem({ text, active }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${active ? 'text-text font-medium' : 'text-muted/50'}`}>
      <svg
        className={`h-4 w-4 ${active ? 'text-brand-600' : 'text-muted/20'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
      {text}
    </div>
  );
}
