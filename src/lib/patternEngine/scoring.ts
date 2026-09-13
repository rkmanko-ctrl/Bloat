import type { CandidateFactor, PatternConfidence } from "../types";
import { fisherExactOneSidedGreater, mean, median, percentile } from "./stats";
import { DEFAULT_CONFIG, type FactorEvidence, type MealObservation, type PatternEngineConfig, type SymptomObservation } from "./types";

interface MealWithOutcome {
  meal: MealObservation;
  /** Max severity among symptom events attributed to this meal (0 if none). */
  severity: number;
  symptomPositive: boolean;
  /** Hours from meal to the earliest symptom event that crossed the
   * threshold, if any — used for "typical symptom timing" copy. */
  onsetHours: number | null;
}

const factorKey = (f: CandidateFactor) => `${f.type}:${f.key}`;

/**
 * Attaches each symptom event to the single nearest *preceding* meal within
 * `windowHours`, then rolls that up into a per-meal outcome (symptom
 * positive/negative, severity, onset time).
 *
 * Attributing to the nearest preceding meal (rather than "every meal in the
 * past N hours") avoids double-crediting one bloating episode to several
 * back-to-back meals, which would inflate every candidate factor's apparent
 * association.
 */
function attributeSymptomsToMeals(
  meals: MealObservation[],
  symptoms: SymptomObservation[],
  config: PatternEngineConfig
): MealWithOutcome[] {
  const sortedMeals = [...meals].sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());
  const windowMs = config.windowHours * 60 * 60 * 1000;

  const bestSeverityByMeal = new Map<string, number>();
  const earliestQualifyingOnsetByMeal = new Map<string, number>();

  for (const symptom of symptoms) {
    let attributedMeal: MealObservation | null = null;
    for (const meal of sortedMeals) {
      const delta = symptom.occurredAt.getTime() - meal.loggedAt.getTime();
      if (delta < 0) break; // meals are sorted ascending; no earlier meal will fit either
      if (delta <= windowMs) attributedMeal = meal;
    }
    if (!attributedMeal) continue;

    const prevSeverity = bestSeverityByMeal.get(attributedMeal.mealId) ?? 0;
    if (symptom.severity > prevSeverity) {
      bestSeverityByMeal.set(attributedMeal.mealId, symptom.severity);
    }

    if (symptom.severity >= config.symptomSeverityThreshold) {
      const onsetHours = (symptom.occurredAt.getTime() - attributedMeal.loggedAt.getTime()) / (60 * 60 * 1000);
      const prevOnset = earliestQualifyingOnsetByMeal.get(attributedMeal.mealId);
      if (prevOnset === undefined || onsetHours < prevOnset) {
        earliestQualifyingOnsetByMeal.set(attributedMeal.mealId, onsetHours);
      }
    }
  }

  return meals.map((meal) => {
    const severity = bestSeverityByMeal.get(meal.mealId) ?? 0;
    const symptomPositive = severity >= config.symptomSeverityThreshold;
    const onsetHours = earliestQualifyingOnsetByMeal.get(meal.mealId) ?? null;
    return { meal, severity, symptomPositive, onsetHours };
  });
}

function tierConfidence(
  exposedCount: number,
  unexposedCount: number,
  effectSize: number,
  pValue: number | null,
  config: PatternEngineConfig
): PatternConfidence | null {
  const hasEnoughData =
    exposedCount >= config.minExposedForConclusion && unexposedCount >= config.minUnexposedForConclusion;

  if (!hasEnoughData) return "early_signal";

  if (effectSize < config.minEffectSizeToReport) {
    // Enough data, but no meaningful difference — not worth reporting as a
    // pattern at all (this is evidence *against* a link, not a weak signal).
    return null;
  }

  const isStrong =
    effectSize >= config.strongPattern.minEffectSize &&
    pValue !== null &&
    pValue <= config.strongPattern.maxPValue &&
    exposedCount >= config.strongPattern.minExposed;

  return isStrong ? "stronger_pattern" : "possible_pattern";
}

/**
 * Core deterministic analysis: given a user's logged meals (each tagged
 * with candidate factors) and symptom events, scores every candidate
 * factor's association with bloating.
 *
 * This is intentionally NOT an LLM call. An LLM is used downstream only to
 * translate the resulting `FactorEvidence` into plain English (see
 * src/lib/ai/insightExplainer.ts) — it never invents the numbers.
 */
export function analyzeCandidateFactors(
  meals: MealObservation[],
  symptoms: SymptomObservation[],
  config: PatternEngineConfig = DEFAULT_CONFIG
): FactorEvidence[] {
  const outcomes = attributeSymptomsToMeals(meals, symptoms, config);

  const factorsByKey = new Map<string, CandidateFactor>();
  for (const meal of meals) {
    for (const f of meal.factors) factorsByKey.set(factorKey(f), f);
  }

  const results: FactorEvidence[] = [];

  for (const [key, factor] of factorsByKey) {
    const exposed = outcomes.filter((o) => o.meal.factors.some((f) => factorKey(f) === key));
    const unexposed = outcomes.filter((o) => !o.meal.factors.some((f) => factorKey(f) === key));

    if (exposed.length < config.minOccasionsToSurface) continue;
    if (unexposed.length === 0) continue; // no comparison group possible yet

    const exposedSymptomCount = exposed.filter((o) => o.symptomPositive).length;
    const unexposedSymptomCount = unexposed.filter((o) => o.symptomPositive).length;

    const exposedRate = exposedSymptomCount / exposed.length;
    const unexposedRate = unexposedSymptomCount / unexposed.length;
    const effectSize = exposedRate - unexposedRate;

    const pValue = fisherExactOneSidedGreater(
      exposedSymptomCount,
      exposed.length - exposedSymptomCount,
      unexposedSymptomCount,
      unexposed.length - unexposedSymptomCount
    );

    const confidence = tierConfidence(exposed.length, unexposed.length, effectSize, pValue, config);
    if (confidence === null) continue;

    const onsetHours = exposed
      .filter((o) => o.symptomPositive && o.onsetHours !== null)
      .map((o) => o.onsetHours as number);
    const p25 = percentile(onsetHours, 0.25);
    const p75 = percentile(onsetHours, 0.75);

    results.push({
      factor,
      exposedCount: exposed.length,
      exposedSymptomCount,
      unexposedCount: unexposed.length,
      unexposedSymptomCount,
      exposedAvgSeverity: mean(exposed.map((o) => o.severity)),
      unexposedAvgSeverity: mean(unexposed.map((o) => o.severity)),
      effectSize,
      pValue,
      medianOnsetHours: median(onsetHours),
      onsetHoursRange: p25 !== null && p75 !== null ? [p25, p75] : null,
      confidence,
      exposedMealIds: exposed.map((o) => o.meal.mealId),
      unexposedMealIds: unexposed.map((o) => o.meal.mealId),
    });
  }

  return rankFactorEvidence(results);
}

const CONFIDENCE_RANK: Record<PatternConfidence, number> = {
  stronger_pattern: 2,
  possible_pattern: 1,
  early_signal: 0,
};

export function rankFactorEvidence(results: FactorEvidence[]): FactorEvidence[] {
  return [...results].sort((a, b) => {
    const tierDiff = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    if (tierDiff !== 0) return tierDiff;
    if (b.effectSize !== a.effectSize) return b.effectSize - a.effectSize;
    return b.exposedCount - a.exposedCount;
  });
}
