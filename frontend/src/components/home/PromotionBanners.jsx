import { useMemo, useState } from 'react';
import novaPayBanner from '@/assets/promotions/ticketrush-novapay.svg';
import metroRideBanner from '@/assets/promotions/ticketrush-metroride.svg';
import soundSipBanner from '@/assets/promotions/ticketrush-soundsip.svg';

const banners = [
  {
    src: novaPayBanner,
    alt: 'TicketRush x NovaPay - ưu đãi thanh toán vé sự kiện'
  },
  {
    src: metroRideBanner,
    alt: 'TicketRush x MetroRide - ưu đãi di chuyển đến sự kiện'
  },
  {
    src: soundSipBanner,
    alt: 'TicketRush x SoundSip - combo đồ uống khi đặt vé concert'
  }
];

export default function PromotionBanners() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeBanner = banners[activeIndex];
  const nextBanners = useMemo(
    () => banners.filter((_, index) => index !== activeIndex),
    [activeIndex]
  );

  return (
    <section className="container mx-auto space-y-4" aria-labelledby="home-promotion-heading">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Đối tác ưu đãi</p>
          <h2 id="home-promotion-heading" className="mt-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">
            Deal nổi bật cho khán giả TicketRush
          </h2>
        </div>
       
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-[1.75rem] border border-white/50 bg-card/50 shadow-[0_24px_70px_-42px_hsl(var(--tr-primary)/0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_32px_90px_-48px_hsl(var(--tr-primary)/0.58)] dark:border-white/10" aria-live="polite">
          <img
            src={activeBanner.src}
            alt={activeBanner.alt}
            className="block aspect-[1440/260] h-auto w-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {nextBanners.map((banner) => {
            const originalIndex = banners.findIndex((item) => item.src === banner.src);
            return (
              <button
                key={banner.src}
                type="button"
                onClick={() => setActiveIndex(originalIndex)}
                className="group overflow-hidden rounded-2xl border border-foreground/10 bg-card/60 p-1 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-xl dark:bg-white/[0.06]"
                aria-label={`Hiển thị banner ${banner.alt}`}
              >
                <img
                  src={banner.src}
                  alt=""
                  aria-hidden="true"
                  className="block aspect-[1440/260] h-full w-full rounded-[0.85rem] object-cover opacity-80 transition group-hover:opacity-100"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
