import type { CandidateFactor, ContextFactorKey, PortionSize } from "./types";

/** Mirrors the seed rows in supabase/migrations/0001_init.sql. */
export const INGREDIENT_CATEGORY_LABELS: Record<string, string> = {
  dairy: "Dairy",
  carbonated: "Carbonated drinks",
  cruciferous_vegetables: "Cruciferous vegetables",
  legumes: "Beans & legumes",
  high_fat: "High-fat",
  fried: "Fried food",
  gluten_grains: "Wheat & gluten grains",
  onion_garlic: "Onion & garlic",
  artificial_sweeteners: "Artificial sweeteners",
  spicy: "Spicy food",
  alcohol: "Alcohol",
  caffeine: "Caffeine",
  processed: "Processed / packaged food",
  lean_protein: "Lean protein",
  fruit: "Fruit",
  leafy_greens: "Leafy greens",
};

/** Mirrors section 8's optional context factors. */
export const CONTEXT_FACTOR_LABELS: Record<ContextFactorKey, string> = {
  carbonated_drink: "Carbonated drinks",
  alcohol: "Alcohol",
  coffee: "Coffee",
  unusually_large_meal: "Unusually large meal",
  ate_quickly: "Eating quickly",
  late_meal: "Late meal",
  stress: "Stress",
  poor_sleep: "Poor sleep",
  menstrual_cycle: "Menstrual cycle",
};

/**
 * Converts a meal's raw attributes into the candidate factor tags the
 * pattern engine reasons over. Used by both the mock repository and (once
 * wired up) the Supabase-backed repository, so a meal is tagged identically
 * regardless of where its data lives.
 */
export function deriveMealFactors(params: {
  portionSize: PortionSize | null;
  ingredientCategoryKeys: string[];
  contextFactorKeys: ContextFactorKey[];
  loggedAt: Date;
}): CandidateFactor[] {
  const factors: CandidateFactor[] = [];

  for (const key of params.ingredientCategoryKeys) {
    const label = INGREDIENT_CATEGORY_LABELS[key];
    if (label) factors.push({ type: "ingredient_category", key, label });
  }

  for (const key of params.contextFactorKeys) {
    factors.push({ type: "context_factor", key, label: CONTEXT_FACTOR_LABELS[key] });
  }

  if (params.portionSize === "large") {
    factors.push({ type: "portion_size", key: "large", label: "Large meals" });
  }

  const hour = params.loggedAt.getHours();
  if (hour >= 18) {
    factors.push({ type: "meal_timing", key: "evening", label: "Evening meals" });
  }

  return factors;
}
