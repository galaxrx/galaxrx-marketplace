export const DELIVERY_OPTIONS = {
  PICKUP_ONLY: {
    label: "Pickup only",
    description: "Buyer collects from your pharmacy. No shipping.",
  },
  LOCAL_COURIER: {
    label: "Local courier",
    description: "You arrange courier delivery (e.g. same city or region).",
  },
  NATIONAL_SHIPPING: {
    label: "National shipping",
    description: "You ship Australia-wide. Buyer pays or you include in your process.",
  },
} as const;

export type DeliveryOptionKey = keyof typeof DELIVERY_OPTIONS;

export function getDeliveryOption(key: string) {
  return DELIVERY_OPTIONS[key as DeliveryOptionKey] ?? { label: key, description: "" };
}
