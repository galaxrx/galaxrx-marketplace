import OrdersPageClient from "@/components/orders/OrdersPageClient";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  return <OrdersPageClient success={params.success ?? null} />;
}
