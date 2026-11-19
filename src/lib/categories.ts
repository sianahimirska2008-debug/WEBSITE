export const CATEGORIES = [
  { slug: "haircut", label: "Haircut" },
  { slug: "barber", label: "Barber" },
  { slug: "colour", label: "Colour" },
  { slug: "nails", label: "Nails" },
  { slug: "lashes", label: "Lashes" },
  { slug: "brows", label: "Brows" },
  { slug: "facials", label: "Facials" },
  { slug: "massage", label: "Massage" },
  { slug: "waxing", label: "Waxing" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function isCategory(slug: string): slug is CategorySlug {
  return CATEGORIES.some((c) => c.slug === slug);
}

export const BUSINESS_TYPE_LABEL: Record<string, string> = {
  SALON: "Hair salon",
  BEAUTY: "Beauty studio",
  BARBER: "Barber",
};
