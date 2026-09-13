import type { CandidateFactor, PatternConfidence } from "../types";

export interface MealObservation {
  mealId: string;
  loggedAt: Date;
  /** Every candidate factor tag present on this meal — ingredient
   * categories, portion size, meal-timing bucket, and any per-meal context
   * factors (carbonated drink, ate quickly, etc). Derived once up front so
   * the scoring code stays a pure function of tags + timestamps. */
  factors: CandidateFactor[];
}

export interface SymptomObservation {
  symptomId: string;
  occurredAt: Date;
  severity: number; // 0-5
}

export interface PatternEngineConfig {
  /** How many hours after a meal a symptom can plausibly be attributed to
   * it. Bloating is typically felt within a few hours of eating. */
  windowHours: number;
  /** Minimum severity to count a meal as "symptom positive" for the
   * exposed-vs-unexposed comparison. 0-5 scale; 2 = mild-to-moderate. */
  symptomSeverityThreshold: number;
  /** A factor isn't reported at all below this many exposed occasions —
   * there just isn't enough happening yet to say anything, even tentatively. */
  minOccasionsToSurface: number;
  /** Below these sample sizes we cap confidence at "early_signal"
   * regardless of the observed effect size. */
  minExposedForConclusion: number;
  minUnexposedForConclusion: number;
  /** Difference in symptom-positive rate (0-1) below which we don't
   * consider the factor a pattern worth reporting at all, once sample size
   * is adequate. */
  minEffectSizeToReport: number;
  /** Thresholds for the top confidence tier. */
  strongPattern: {
    minEffectSize: number;
    maxPValue: number;
    minExposed: number;
  };
}

export const DEFAULT_CONFIG: PatternEngineConfig = {
  windowHours: 4,
  symptomSeverityThreshold: 2,
  minOccasionsToSurface: 3,
  minExposedForConclusion: 5,
  minUnexposedForConclusion: 5,
  minEffectSizeToReport: 0.15,
  strongPattern: {
    minEffectSize: 0.3,
    maxPValue: 0.05,
    minExposed: 8,
  },
};

export interface FactorEvidence {
  factor: CandidateFactor;
  exposedCount: number;
  exposedSymptomCount: number;
  unexposedCount: number;
  unexposedSymptomCount: number;
  exposedAvgSeverity: number;
  unexposedAvgSeverity: number;
  /** exposedSymptomCount/exposedCount - unexposedSymptomCount/unexposedCount */
  effectSize: number;
  pValue: number | null;
  medianOnsetHours: number | null;
  /** Rough [p25, p75] onset window, used for copy like "~1-3 hours later". */
  onsetHoursRange: [number, number] | null;
  confidence: PatternConfidence;
  exposedMealIds: string[];
  unexposedMealIds: string[];
}
