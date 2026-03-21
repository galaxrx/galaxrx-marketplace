// Category enum values (must match prisma/schema.prisma Category enum)
export const CATEGORY_VALUES = [
  "PRESCRIPTION",
  "OTC",
  "VACCINES",
  "VETERINARY",
  "COSMETICS",
  "SUPPLEMENTS",
  "DEVICES",
  "CONSUMABLES",
  "OTHER",
  "FRAGRANCE",
  "VITAMINS_SUPPLEMENTS",
  "PREGNANCY_BABY",
  "SKINCARE",
  "HAIR_CARE",
  "ORAL_CARE",
  "PERSONAL_CARE",
  "MEDICINES",
  "MEDICAL_SUPPLIES",
  "FIRST_AID",
  "SPORT_FITNESS",
  "HOME_PET",
] as const;

export type CategoryValue = (typeof CATEGORY_VALUES)[number];

/** Display labels for filters and forms */
export const CATEGORY_LABELS: Record<CategoryValue, string> = {
  PRESCRIPTION: "Prescription",
  OTC: "OTC",
  VACCINES: "Vaccines",
  VETERINARY: "Veterinary",
  COSMETICS: "Cosmetics",
  SUPPLEMENTS: "Supplements",
  DEVICES: "Devices",
  CONSUMABLES: "Consumables",
  OTHER: "Other",
  FRAGRANCE: "Fragrance",
  VITAMINS_SUPPLEMENTS: "Vitamins & Supplements",
  PREGNANCY_BABY: "Pregnancy & Baby",
  SKINCARE: "Skincare",
  HAIR_CARE: "Hair Care",
  ORAL_CARE: "Oral Care",
  PERSONAL_CARE: "Personal Care",
  MEDICINES: "Medicines",
  MEDICAL_SUPPLIES: "Medical Supplies",
  FIRST_AID: "First Aid",
  SPORT_FITNESS: "Sport & Fitness",
  HOME_PET: "Home & Pet",
};

export const CATEGORY_OPTIONS = CATEGORY_VALUES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));
