import Link from "next/link";

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: Props) {
  return (
    <div className="text-center py-12 px-4 bg-mid-navy border border-white/10 rounded-xl">
      <p className="font-medium text-white">{title}</p>
      {description && (
        <p className="text-sm text-white/70 mt-1">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-block mt-4 text-gold font-medium hover:underline"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
