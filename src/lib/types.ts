/**
 * Core domain types, mirroring the Postgres schema in
 * supabase/migrations/0001_init.sql.
 *
 * Principle (see section 20/21 of the product spec): raw observations
 * (what the user logged, what the vision model detected) are stored
 * separately from interpretation (patterns, insights). Interpretation can
 * be recomputed later as the analysis models improve without losing any
 * source data.
 */

export type UUID = string;
export type ISODateTime = string;

// ---------------------------------------------------------------------------
// User & subscription
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: UUID;
  createdAt: ISODateTime;
  displayName?: string;
  timezone: string;
  onboarding: OnboardingAnswers | null;
  baselineStartedAt: ISODateTime | null;
  baselineComplete: boolean;
}

export interface OnboardingAnswers {
  bloatTiming: BloatTiming[];
  frequency: BloatFrequency;
  symptomTypes: SymptomType[];
  goals: string[];
}

export type BloatTiming =
  | "after_breakfast"
  | "after_lunch"
  | "after_dinner"
  | "mostly_evening"
  | "random";

export type BloatFrequency =
  | "almost_daily"
  | "few_times_week"
  | "about_weekly"
  | "occasionally";

export type SubscriptionTier = "free" | "pro";

export interface Subscription {
  id: UUID;
  userId: UUID;
  tier: SubscriptionTier;
  provider: "revenuecat";
  productId: string | null;
  currentPeriodEnd: ISODateTime | null;
  status: "active" | "trialing" | "canceled" | "expired" | "none";
}

// ---------------------------------------------------------------------------
// Meals — raw observation layer
// ---------------------------------------------------------------------------

export type PortionSize = "small" | "medium" | "large";

export interface Meal {
  id: UUID;
  userId: UUID;
  loggedAt: ISODateTime; // when the meal actually happened (user-editable)
  createdAt: ISODateTime; // when the log entry was created
  portionSize: PortionSize | null;
  notes: string | null; // free text, e.g. "garlic sauce"
  source: "photo" | "manual";
}

export interface MealPhoto {
  id: UUID;
  mealId: UUID;
  storagePath: string; // Supabase Storage object path
  createdAt: ISODateTime;
  // Raw model output, stored verbatim so re-analysis is possible later
  // without re-calling the vision model.
  visionRawResponse: unknown | null;
  visionModel: string | null;
}

export interface IngredientCategory {
  id: UUID;
  key: string; // e.g. "dairy", "cruciferous_vegetables", "carbonated"
  label: string; // e.g. "Dairy"
  isBloatRelevant: boolean; // curated flag: commonly-discussed bloat factor
}

export interface Ingredient {
  id: UUID;
  name: string; // normalized, e.g. "broccoli"
  categoryId: UUID | null;
}

export interface MealIngredient {
  id: UUID;
  mealId: UUID;
  ingredientId: UUID | null; // null if only a free-text label was captured
  rawLabel: string; // what was shown/typed, e.g. "creamy sauce"
  source: "vision" | "user_added" | "user_confirmed";
  confidence: number | null; // 0-1, from vision model; null for user-entered
}

// ---------------------------------------------------------------------------
// Symptoms — raw observation layer
// ---------------------------------------------------------------------------

export type SymptomType =
  | "tightness"
  | "fullness"
  | "gas"
  | "visible_bloating"
  | "discomfort"
  | "other";

export interface SymptomEvent {
  id: UUID;
  userId: UUID;
  occurredAt: ISODateTime;
  createdAt: ISODateTime;
  severity: 0 | 1 | 2 | 3 | 4 | 5;
  types: SymptomType[];
  notes: string | null;
  redFlags: RedFlagSymptom[]; // see safety flow
}

export type RedFlagSymptom =
  | "severe_persistent_pain"
  | "blood_in_stool"
  | "repeated_vomiting"
  | "unexplained_weight_loss"
  | "fever"
  | "other_concerning";

// ---------------------------------------------------------------------------
// Optional context factors — logged per meal or per day
// ---------------------------------------------------------------------------

export type ContextFactorKey =
  | "carbonated_drink"
  | "alcohol"
  | "coffee"
  | "unusually_large_meal"
  | "ate_quickly"
  | "late_meal"
  | "stress"
  | "poor_sleep"
  | "menstrual_cycle";

export interface ContextFactor {
  id: UUID;
  userId: UUID;
  mealId: UUID | null; // meal-scoped (e.g. carbonated_drink) or...
  occurredAt: ISODateTime; // ...day-scoped (e.g. poor_sleep, stress)
  key: ContextFactorKey;
  value: string | number | boolean | null;
}

// ---------------------------------------------------------------------------
// Pattern engine output — interpretation layer
// ---------------------------------------------------------------------------

export type PatternConfidence = "early_signal" | "possible_pattern" | "stronger_pattern";

export type CandidateFactorType =
  | "ingredient_category"
  | "context_factor"
  | "portion_size"
  | "meal_timing";

export interface CandidateFactor {
  type: CandidateFactorType;
  key: string; // ingredient category key, context factor key, etc.
  label: string;
}

export interface Pattern {
  id: UUID;
  userId: UUID;
  factor: CandidateFactor;
  confidence: PatternConfidence;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  // Human-readable summary, generated by the LLM explainer from the
  // evidence object below (never used as the source of truth for ranking).
  summary: string;
  isActive: boolean; // false once dismissed or superseded
}

export interface PatternEvidence {
  id: UUID;
  patternId: UUID;
  computedAt: ISODateTime;
  exposedCount: number;
  exposedSymptomCount: number;
  unexposedCount: number;
  unexposedSymptomCount: number;
  exposedAvgSeverity: number;
  unexposedAvgSeverity: number;
  effectSize: number; // difference in symptom-positive proportion
  pValue: number | null; // one-sided Fisher's exact; null if not computable
  medianOnsetHours: number | null;
  // IDs of the underlying meals/symptom events used, for auditability.
  exposedMealIds: UUID[];
  unexposedMealIds: UUID[];
}

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

export type ExperimentStatus = "active" | "completed" | "abandoned";

export interface Experiment {
  id: UUID;
  userId: UUID;
  patternId: UUID | null;
  title: string; // "Skip carbonated drinks"
  factor: CandidateFactor;
  startedAt: ISODateTime;
  endsAt: ISODateTime; // startedAt + durationDays
  durationDays: number;
  status: ExperimentStatus;
  baselineAvgSeverity: number | null;
}

export interface ExperimentObservation {
  id: UUID;
  experimentId: UUID;
  date: string; // yyyy-mm-dd, one row per day
  avgSeverity: number | null;
  symptomCount: number;
  adheredToExperiment: boolean;
}

export interface ExperimentResult {
  experimentId: UUID;
  baselineAvgSeverity: number;
  experimentAvgSeverity: number;
  baselineHighEpisodeCount: number; // severity >= 3
  experimentHighEpisodeCount: number;
  daysObserved: number;
  improved: boolean;
  interpretation: string;
}

// ---------------------------------------------------------------------------
// Insights (LLM-authored explanations, always backed by PatternEvidence)
// ---------------------------------------------------------------------------

export interface UserInsight {
  id: UUID;
  userId: UUID;
  patternId: UUID | null;
  experimentId: UUID | null;
  createdAt: ISODateTime;
  kind: "pattern_found" | "experiment_result" | "milestone" | "safety";
  text: string;
  seenAt: ISODateTime | null;
}
