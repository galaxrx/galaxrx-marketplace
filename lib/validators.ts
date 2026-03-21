import { z } from "zod";

/** Max allowed price per pack (currency ceiling). */
const PRICE_PER_PACK_CEILING = 999_999.99;

/**
 * Shared validation for proposed price per pack (negotiations, etc.):
 * positive, finite, ≤ ceiling, at most 2 decimal places for currency.
 */
export const proposedPricePerPackSchema = z
  .number()
  .finite("Price must be a valid number")
  .positive("Price must be greater than zero")
  .max(PRICE_PER_PACK_CEILING, `Price cannot exceed $${PRICE_PER_PACK_CEILING.toLocaleString()}`)
  .refine(
    (n) => Math.abs(n - Math.round(n * 100) / 100) < 1e-6,
    "Price must have at most 2 decimal places"
  );

export type ProposedPricePerPack = z.infer<typeof proposedPricePerPackSchema>;

/** Body schema for POST /api/listings/[id]/negotiate */
export const negotiateBodySchema = z.object({
  proposedPricePerPack: proposedPricePerPackSchema,
  message: z.string().max(500).optional(),
});

export type NegotiateBody = z.infer<typeof negotiateBodySchema>;

/**
 * Validates a raw value (e.g. from form or parseFloat). Use in API and client.
 * Returns { success: true, data } or { success: false, error: string }.
 */
export function validateProposedPricePerPack(
  value: unknown
): { success: true; data: number } | { success: false; error: string } {
  const result = proposedPricePerPackSchema.safeParse(value);
  if (result.success) return { success: true, data: result.data };
  const first = result.error.issues[0];
  return { success: false, error: first?.message ?? "Invalid price" };
}
