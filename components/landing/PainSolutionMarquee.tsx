import Image from "next/image";

const MARQUEE_ITEMS: ({ type: "text"; slogan: string } | { type: "logo" })[] = [
  { type: "logo" },
  { type: "text", slogan: "Surplus & overstock → sold, not shelved." },
  { type: "logo" },
  { type: "text", slogan: "Clear before expiry. Don't let it hit the bin." },
  { type: "logo" },
  { type: "text", slogan: "Turn idle stock into liquidity." },
  { type: "logo" },
  { type: "text", slogan: "Same trade. Smarter." },
];

function MarqueeItem({ item }: { item: (typeof MARQUEE_ITEMS)[number] }) {
  if (item.type === "logo") {
    return (
      <div className="flex items-center justify-center px-10 shrink-0" aria-hidden>
        <div className="relative h-14 w-40 sm:h-16 sm:w-48 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt=""
            width={192}
            height={64}
            className="object-contain object-center h-full w-full opacity-95"
            unoptimized
          />
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex items-center shrink-0 px-6 py-3 rounded-full border border-gold/25 bg-gold/5 hover:bg-gold/10 hover:border-gold/40 transition-all duration-300"
      aria-hidden
    >
      <span className="text-gold font-semibold text-sm sm:text-base tracking-wide whitespace-nowrap">
        {item.slogan}
      </span>
    </div>
  );
}

export default function PainSolutionMarquee() {
  const duplicated = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div
      className="border-y border-[rgba(161,130,65,0.12)] bg-[#091422] py-5 overflow-hidden"
      aria-label="Why GalaxRX"
    >
      <div className="marquee-track marquee-track-slow flex items-center gap-2">
        {duplicated.map((item, i) => (
          <MarqueeItem key={i} item={item} />
        ))}
      </div>
    </div>
  );
}
