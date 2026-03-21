import Image from "next/image";

export default function BlobImageFrame({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`photo-frame-fantasy group relative w-full aspect-video ${className}`}>
      {/* Outer glow */}
      <div
        className="absolute -inset-1 rounded-[1.25rem] bg-gradient-to-br from-gold/30 via-gold-muted/20 to-gold/25 opacity-70 blur-md group-hover:opacity-100 transition-opacity duration-500"
        aria-hidden
      />
      {/* Gradient border: padding shows gradient, inner area is image */}
      <div className="absolute inset-0 rounded-2xl p-[3px] bg-gradient-to-br from-gold-muted via-gold to-gold-muted/80 bg-[length:200%_200%] animate-frame-gradient">
        <div className="absolute inset-[3px] rounded-[calc(1rem-3px)] overflow-hidden bg-[#0D1B2A]">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>
      {/* Inner highlight for depth */}
      <div
        className="absolute inset-[3px] rounded-[calc(1rem-3px)] pointer-events-none z-[1] opacity-30"
        style={{ boxShadow: "inset 1px 1px 0 0 rgba(255,255,255,0.2)" }}
        aria-hidden
      />
    </div>
  );
}
