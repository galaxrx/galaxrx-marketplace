"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Props = {
  basePath: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
};

export default function ListingsPagination({
  basePath,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
}: Props) {
  const searchParams = useSearchParams();
  if (totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(page));
    return `${basePath}?${next.toString()}`;
  };

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-white/60">
        Showing {start}–{end} of {totalCount}
      </p>
      <nav className="flex items-center gap-2" aria-label="Pagination">
        {currentPage > 1 ? (
          <Link
            href={buildUrl(currentPage - 1)}
            className="px-4 py-2 rounded-lg border border-[rgba(161,130,65,0.3)] text-gold hover:bg-gold/10 font-medium text-sm transition"
          >
            ← Previous
          </Link>
        ) : (
          <span className="px-4 py-2 rounded-lg border border-white/10 text-white/40 text-sm cursor-not-allowed">
            ← Previous
          </span>
        )}
        <span className="px-3 py-2 text-white/80 text-sm">
          Page {currentPage} of {totalPages}
        </span>
        {currentPage < totalPages ? (
          <Link
            href={buildUrl(currentPage + 1)}
            className="px-4 py-2 rounded-lg border border-[rgba(161,130,65,0.3)] text-gold hover:bg-gold/10 font-medium text-sm transition"
          >
            Next →
          </Link>
        ) : (
          <span className="px-4 py-2 rounded-lg border border-white/10 text-white/40 text-sm cursor-not-allowed">
            Next →
          </span>
        )}
      </nav>
    </div>
  );
}
