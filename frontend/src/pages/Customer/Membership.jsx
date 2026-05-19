import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import membershipService from '../../services/membershipService.js';
import Button from '../../components/common/Button.jsx';

const tierVisuals = {
  BRONZE: {
    panel: 'border-[#b56b42]/55 bg-[radial-gradient(circle_at_18%_20%,rgba(255,205,161,.38),transparent_30%),linear-gradient(135deg,rgba(255,247,237,.96),rgba(180,92,48,.14)_48%,rgba(255,255,255,.9))] shadow-[0_24px_70px_rgba(139,69,19,.18)] dark:border-[#f0a36f]/45 dark:bg-[radial-gradient(circle_at_18%_20%,rgba(240,163,111,.22),transparent_32%),linear-gradient(135deg,rgba(40,24,17,.96),rgba(108,52,28,.58)_48%,rgba(20,18,17,.95))] dark:shadow-[0_24px_70px_rgba(240,132,66,.13)]',
    title: 'text-transparent bg-clip-text bg-[linear-gradient(110deg,#6f341e,#d58b54_42%,#fff1d8_52%,#8d4525_68%,#3d2117)] dark:bg-[linear-gradient(110deg,#ffddb8,#b96938_38%,#fff6e8_52%,#e69a5e_68%,#7c351b)]',
    orb: 'border-[#b56b42]/40 bg-[radial-gradient(circle_at_30%_24%,#fff5e6,#c87a45_35%,#7a351d_72%,#2c160f)] text-[#fff2df] shadow-[inset_0_1px_16px_rgba(255,244,226,.72),0_18px_42px_rgba(130,66,32,.32)]',
    progress: 'from-[#7b351d] via-[#d8894e] to-[#fff0d6]',
    active: 'bg-[#8d4525] text-[#fff7ed]',
    check: 'text-[#b56b42] dark:text-[#f0a36f]',
  },
  SILVER: {
    panel: 'border-slate-300/80 bg-[radial-gradient(circle_at_20%_14%,rgba(255,255,255,.9),transparent_24%),linear-gradient(135deg,#f8fafc,#cbd5e1_44%,#ffffff_56%,#94a3b8)] shadow-[0_24px_70px_rgba(71,85,105,.18)] dark:border-slate-300/35 dark:bg-[radial-gradient(circle_at_20%_14%,rgba(255,255,255,.18),transparent_24%),linear-gradient(135deg,#0f172a,#334155_44%,#94a3b8_56%,#111827)] dark:shadow-[0_24px_70px_rgba(148,163,184,.12)]',
    title: 'text-transparent bg-clip-text bg-[linear-gradient(110deg,#334155,#94a3b8_35%,#ffffff_50%,#64748b_66%,#111827)] dark:bg-[linear-gradient(110deg,#f8fafc,#94a3b8_35%,#ffffff_50%,#cbd5e1_66%,#64748b)]',
    orb: 'border-slate-300/70 bg-[radial-gradient(circle_at_30%_24%,#ffffff,#cbd5e1_42%,#64748b_78%,#172033)] text-slate-900 shadow-[inset_0_1px_18px_rgba(255,255,255,.9),0_18px_42px_rgba(100,116,139,.3)]',
    progress: 'from-slate-500 via-slate-200 to-slate-600',
    active: 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-950',
    check: 'text-slate-600 dark:text-slate-200',
  },
  GOLD: {
    panel: 'border-[#d6a724]/65 bg-[radial-gradient(circle_at_18%_18%,rgba(255,247,196,.95),transparent_26%),linear-gradient(135deg,#fff8d7,#f6c945_38%,#fffef2_52%,#b77905_78%)] shadow-[0_26px_80px_rgba(202,138,4,.24)] dark:border-[#facc15]/55 dark:bg-[radial-gradient(circle_at_18%_18%,rgba(250,204,21,.28),transparent_28%),linear-gradient(135deg,#241a05,#7c4f08_38%,#f6c945_52%,#1c1405_86%)] dark:shadow-[0_26px_80px_rgba(250,204,21,.16)]',
    title: 'text-transparent bg-clip-text bg-[linear-gradient(110deg,#8a5700,#f2bd22_34%,#fff7bd_49%,#d99105_64%,#4d2b00)] dark:bg-[linear-gradient(110deg,#fff3a6,#facc15_34%,#ffffff_49%,#d97706_64%,#fff0a8)]',
    orb: 'border-[#facc15]/60 bg-[radial-gradient(circle_at_30%_24%,#fff9bf,#facc15_36%,#b45309_76%,#3b2202)] text-[#3b2202] shadow-[inset_0_1px_20px_rgba(255,255,210,.9),0_20px_52px_rgba(217,119,6,.36)]',
    progress: 'from-[#a16207] via-[#facc15] to-[#fff7ad]',
    active: 'bg-[#a16207] text-[#fffbea] dark:bg-[#facc15] dark:text-[#2b1800]',
    check: 'text-[#b77905] dark:text-[#facc15]',
  },
  PLATINUM: {
    panel: 'border-cyan-300/75 bg-[radial-gradient(circle_at_16%_18%,rgba(236,254,255,.98),transparent_28%),linear-gradient(135deg,#f8fdff,#bff4ff_30%,#ffffff_45%,#a7f3d0_60%,#c4b5fd_88%)] shadow-[0_28px_90px_rgba(6,182,212,.22)] dark:border-cyan-200/55 dark:bg-[radial-gradient(circle_at_16%_18%,rgba(103,232,249,.25),transparent_28%),linear-gradient(135deg,#07131d,#155e75_30%,#e0fbff_45%,#0f766e_60%,#1e1b4b_88%)] dark:shadow-[0_28px_90px_rgba(103,232,249,.16)]',
    title: 'text-transparent bg-clip-text bg-[linear-gradient(110deg,#0e7490,#67e8f9_28%,#ffffff_43%,#a7f3d0_58%,#7c3aed_76%,#083344)] dark:bg-[linear-gradient(110deg,#cffafe,#67e8f9_28%,#ffffff_43%,#a7f3d0_58%,#c4b5fd_76%,#ecfeff)]',
    orb: 'border-cyan-100/80 bg-[conic-gradient(from_130deg,#ecfeff,#67e8f9,#ffffff,#a7f3d0,#c4b5fd,#ecfeff)] text-cyan-950 shadow-[inset_0_1px_24px_rgba(255,255,255,.95),0_22px_58px_rgba(34,211,238,.36)]',
    progress: 'from-cyan-500 via-white to-emerald-300',
    active: 'bg-cyan-700 text-white dark:bg-cyan-100 dark:text-cyan-950',
    check: 'text-cyan-700 dark:text-cyan-200',
  },
};

const getTierVisual = (tierName) => tierVisuals[tierName] ?? tierVisuals.BRONZE;

export default function Membership() {
  const queryClient = useQueryClient();

  const { data: membership, isLoading: memberLoading } = useQuery({
    queryKey: ['membership', 'me'],
    queryFn: membershipService.getMyMembership,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: tiers, isLoading: tiersLoading } = useQuery({
    queryKey: ['membership', 'tiers'],
    queryFn: membershipService.getTiers,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const upgradeMutation = useMutation({
    mutationFn: membershipService.upgradeTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      window.alert('Nâng cấp hạng thành công!');
    },
    onError: (err) => {
      window.alert(err?.message || 'Nâng cấp thất bại');
    },
  });

  const currentTier = tiers?.find((tier) => tier.name === membership?.tier);
  const currentPriority = currentTier?.priority_level ?? -1;
  const currentVisual = getTierVisual(membership?.tier);
  const progress = membership?.next_tier_points
    ? Math.min(100, (membership.points / membership.next_tier_points) * 100)
    : 100;
  const pointsToNext = Math.max(0, (membership?.next_tier_points || 0) - (membership?.points || 0));

  const handleUpgrade = (tierId, tierName) => {
    if (window.confirm(`Bạn có chắc chắn muốn nâng cấp lên hạng ${tierName}?`)) {
      upgradeMutation.mutate(tierId);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <style>
        {`
          @keyframes membership-shine {
            0% { background-position: 180% 0; }
            48%, 100% { background-position: -120% 0; }
          }
        `}
      </style>

      <header className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-purple-400">
          Chương trình Thành viên
        </h1>
        <p className="mx-auto max-w-2xl text-lg font-semibold leading-relaxed text-slate-700 dark:text-cyan-50/85">
          Tích lũy điểm từ mỗi tấm vé và thăng hạng để nhận những đặc quyền ưu tiên độc quyền.
        </p>
      </header>

      <section className={`relative overflow-hidden rounded-3xl border p-8 ${currentVisual.panel}`}>
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:linear-gradient(115deg,transparent_0%,rgba(255,255,255,0)_34%,rgba(255,255,255,.72)_48%,rgba(255,255,255,0)_62%,transparent_100%)] [background-size:220%_100%] [animation:membership-shine_4.8s_ease-in-out_infinite] dark:opacity-35" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,.5),transparent_20%),radial-gradient(circle_at_12%_86%,rgba(255,255,255,.35),transparent_24%)] dark:bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,.18),transparent_20%),radial-gradient(circle_at_12%_86%,rgba(255,255,255,.12),transparent_24%)]" />

        <div className="relative grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <div>
              <div className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-cyan-50/85">Hạng hiện tại</div>
              <div className={`mt-2 text-5xl font-black italic tracking-tighter drop-shadow-sm ${currentVisual.title}`}>
                {memberLoading ? '...' : membership?.tier}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-700 dark:text-cyan-50/85">Tiến trình hạng tiếp theo</span>
                <span className="text-slate-950 dark:text-white">{membership?.points} / {membership?.next_tier_points} pts</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-text/10">
                <div
                  className={`h-full bg-gradient-to-r ${currentVisual.progress} transition-all duration-1000 ease-out`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs font-semibold italic text-slate-700 dark:text-cyan-50/80">
                {pointsToNext > 0
                  ? `Bạn cần thêm ${pointsToNext} điểm để thăng hạng.`
                  : 'Bạn đang ở mốc hạng cao nhất hiện có.'}
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative group">
              <div className={`absolute -inset-1 rounded-full bg-gradient-to-r ${currentVisual.progress} opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200 animate-pulse`} />
              <div className={`relative flex h-40 w-40 items-center justify-center rounded-full border text-4xl font-black shadow-inner ${currentVisual.orb}`}>
                {membership?.tier?.[0] || '-'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Các cấp bậc thành viên</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiersLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl bg-surface border border-text/10" />
            ))
          ) : (
            tiers?.map((tier) => {
              const visual = getTierVisual(tier.name);

              return (
                <div
                  key={tier.id}
                  className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${visual.panel} ${
                    membership?.tier === tier.name ? 'ring-2 ring-white/70 dark:ring-white/20' : ''
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 [background:linear-gradient(115deg,transparent_0%,rgba(255,255,255,.72)_48%,transparent_62%)] [background-size:230%_100%] [animation:membership-shine_5.6s_ease-in-out_infinite] hover:opacity-60 dark:hover:opacity-25" />
                  {membership?.tier === tier.name && (
                    <div className={`absolute -right-6 -top-6 rounded-full px-8 py-8 rotate-12 ${visual.active}`}>
                      <div className="mt-4 -rotate-12 text-[10px] font-bold uppercase tracking-tight">Active</div>
                    </div>
                  )}
                  <div className={`text-lg font-black ${visual.title}`}>{tier.name}</div>
                  <div className="mt-2 text-xs font-semibold leading-relaxed text-slate-700 dark:text-cyan-50/80">{tier.description}</div>
                  <div className="mt-6 space-y-3">
                    <BenefitItem text="Ưu tiên xếp hàng" active={tier.priority_level >= 1} checkClass={visual.check} />
                    <BenefitItem text="Thông báo sớm" active={tier.priority_level >= 2} checkClass={visual.check} />
                    <BenefitItem text="Vào thẳng phòng vé" active={tier.priority_level >= 3} checkClass={visual.check} />
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
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function BenefitItem({ text, active, checkClass }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${active ? 'font-bold text-slate-950 dark:text-white' : 'font-semibold text-slate-500 dark:text-white/45'}`}>
      <svg
        className={`h-4 w-4 ${active ? checkClass : 'text-slate-400 dark:text-white/25'}`}
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
