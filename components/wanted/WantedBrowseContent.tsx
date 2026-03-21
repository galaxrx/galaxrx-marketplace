import { Suspense } from "react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import WantedSearch from "@/components/wanted/WantedSearch";
import WantedFilters from "@/components/wanted/WantedFilters";
import WantedBrowseCard from "@/components/wanted/WantedBrowseCard";

const PAGE_SIZE = 12;
const URGENCIES = ["", "LOW", "NORMAL", "HIGH", "CRITICAL"];
const SORT_OPTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "urgency", label: "Most urgent" },
  { value: "quantity", label: "Highest quantity" },
];

export default async function WantedBrowseContent({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const search = searchParams.search ?? "";
  const urgency = searchParams.urgency ?? "";
  const state = searchParams.state ?? "";
  const sort = searchParams.sort ?? "newest";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where: { isActive: boolean; expiresAt: { gt: Date }; isSOS: boolean; OR?: unknown[]; urgency?: string; pharmacy?: { state: string } } = {
    isActive: true,
    expiresAt: { gt: new Date() },
    isSOS: false,
  };
  if (search.trim()) {
    where.OR = [
      { productName: { contains: search.trim(), mode: "insensitive" } },
      { strength: { contains: search.trim(), mode: "insensitive" } },
      { barcode: { contains: search.trim(), mode: "insensitive" } },
    ];
  }
  if (URGENCIES.includes(urgency) && urgency) where.urgency = urgency;
  if (state) where.pharmacy = { state };

  let orderBy: { createdAt?: "desc" | "asc"; urgency?: "desc"; quantity?: "desc" } = { createdAt: "desc" };
  if (sort === "oldest") orderBy = { createdAt: "asc" };
  else if (sort === "quantity") orderBy = { quantity: "desc" };
  else if (sort === "urgency") orderBy = { urgency: "desc" };

  const whereInput = where as Prisma.WantedItemWhereInput;
  const totalCount = await prisma.wantedItem.count({ where: whereInput });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const skip = (clampedPage - 1) * PAGE_SIZE;

  const items = await prisma.wantedItem.findMany({
    where: whereInput,
    orderBy,
    skip,
    take: PAGE_SIZE,
    include: {
      pharmacy: { select: { id: true, name: true, isVerified: true, state: true } },
    },
  });

  return (
    <div className="w-full max-w-full p-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gold">
          Who wants your stock?
        </h1>
        <Link href="/wanted" className="text-gold font-medium hover:underline text-sm">
          Post what you need →
        </Link>
      </div>
      <p className="text-white/70 text-sm mb-4">
        Browse wanted requests from other pharmacies. Make an offer with your price and quantity — no chat needed.
      </p>
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <Suspense fallback={<div className="flex-1 min-w-[12rem] max-w-xl h-10 rounded-lg bg-white/5 animate-pulse" />}>
          <WantedSearch basePath="/wanted/browse" />
        </Suspense>
        <Suspense fallback={<div className="h-9 w-48 rounded-lg bg-white/5 animate-pulse" />}>
          <WantedFilters basePath="/wanted/browse" />
        </Suspense>
      </div>
      {items.length === 0 ? (
        <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-8 text-center">
          <p className="text-white/70">No wanted requests match your filters.</p>
          <Link href="/wanted" className="mt-3 inline-block text-gold font-medium hover:underline">Post a wanted request</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <WantedBrowseCard key={item.id} item={item} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {clampedPage > 1 && (
                <Link
                  href={`/wanted/browse?${new URLSearchParams({ search, urgency, state, sort, page: String(clampedPage - 1) }).toString()}`}
                  className="px-4 py-2 rounded-lg border border-[rgba(161,130,65,0.3)] text-gold hover:bg-white/5"
                >
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 text-white/70 text-sm">
                Page {clampedPage} of {totalPages}
              </span>
              {clampedPage < totalPages && (
                <Link
                  href={`/wanted/browse?${new URLSearchParams({ search, urgency, state, sort, page: String(clampedPage + 1) }).toString()}`}
                  className="px-4 py-2 rounded-lg border border-[rgba(161,130,65,0.3)] text-gold hover:bg-white/5"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
