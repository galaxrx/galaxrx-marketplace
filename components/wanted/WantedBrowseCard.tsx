"use client";

import MakeOfferModal from "@/components/wanted/MakeOfferModal";
import { shouldSkipImageLoadInProduction } from "@/lib/image-url";

type Item = {
  id: string;
  productName: string;
  strength: string | null;
  barcode: string | null;
  imageUrl: string | null;
  quantity: number;
  maxPrice: number | null;
  urgency: string;
  isSOS?: boolean;
  notes: string | null;
  expiresAt: Date;
  pharmacy: { id: string; name: string; isVerified: boolean; state: string };
};

const urgencyStyles: Record<string, string> = {
  CRITICAL: "border-l-4 border-error bg-error/5",
  HIGH: "border-l-4 border-warning bg-warning/5",
  NORMAL: "",
  LOW: "opacity-80",
};

export default function WantedBrowseCard({ item }: { item: Item }) {
  const isSOS = item.isSOS === true;
  return (
    <div className={`bg-mid-navy border rounded-xl p-4 flex flex-col h-full ${isSOS ? "border-red-500/50 bg-red-950/30" : "border-[rgba(161,130,65,0.18)]"} ${urgencyStyles[item.urgency] ?? ""}`}>
      {isSOS && (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/20 border border-red-500/40 rounded-md px-2 py-1 w-fit mb-2">
          🚨 SOS
        </span>
      )}
      {item.imageUrl && !shouldSkipImageLoadInProduction(item.imageUrl) && (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-white/5 border border-[rgba(161,130,65,0.25)] mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt="" className="w-full h-full object-contain" />
        </div>
      )}
      <h3 className="font-semibold text-white truncate">{item.productName}</h3>
      {item.strength && <p className="text-sm text-white/70">{item.strength}</p>}
      <p className="text-sm text-white/70 mt-1">
        Qty: {item.quantity}
        {item.maxPrice != null && ` · Max $${item.maxPrice.toFixed(2)}/pack`}
      </p>
      <p className="text-xs text-white/60 mt-1">
        {item.pharmacy.name}
        {item.pharmacy.isVerified && " ✓"} · {item.pharmacy.state}
      </p>
      <p className="text-xs text-white/50 mt-1">Expires {new Date(item.expiresAt).toLocaleDateString()}</p>
      <div className="mt-auto pt-3">
        <MakeOfferModal
          item={{ id: item.id, productName: item.productName, strength: item.strength, quantity: item.quantity, maxPrice: item.maxPrice }}
          trigger={
            <span className="block w-full bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] py-2 rounded-xl text-sm font-bold text-center hover:opacity-90 transition cursor-pointer">
              Make offer →
            </span>
          }
        />
      </div>
    </div>
  );
}
