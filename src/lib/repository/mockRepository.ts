import { analyzeCandidateFactors, compareExperimentToBaseline, rankFactorEvidence } from "../patternEngine";
import type { MealObservation, SymptomObservation } from "../patternEngine/types";
import { deriveMealFactors } from "../factors";
import { insightExplainer } from "../ai/insightExplainer";
import type {
  ContextFactorKey,
  Experiment,
  ExperimentObservation,
  ExperimentStatus,
  Meal,
  OnboardingAnswers,
  PortionSize,
  SubscriptionTier,
  SymptomEvent,
  UserProfile,
} from "../types";
import type {
  BloatRepository,
  ExperimentWithProgress,
  LogMealInput,
  LogSymptomInput,
  PatternListItem,
  TodayStatus,
} from "./types";

const genId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

interface InternalMeal extends Meal {
  ingredientCategoryKeys: string[];
  contextFactorKeys: ContextFactorKey[];
}

// A small seeded PRNG so the demo dataset looks the same every app launch,
// which makes screenshots/QA reproducible.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Builds ~3 weeks of realistic history with two seeded associations:
 *   - a strong one (carbonated drinks -> evening bloating)
 *   - a weak/early one (dairy -> occasional bloating, too few occasions yet
 *     to be more than an early signal)
 * plus baseline noise, so every screen has something meaningful to show
 * without requiring a fresh install to log data for three weeks first.
 */
function seedHistory(baselineStartedAt: Date): { meals: InternalMeal[]; symptoms: SymptomEvent[] } {
  const rand = mulberry32(42);
  const meals: InternalMeal[] = [];
  const symptoms: SymptomEvent[] = [];
  const days = 21;

  for (let day = 0; day < days; day++) {
    const dayStart = new Date(baselineStartedAt.getTime() + day * DAY);

    const mealSlots: { hour: number; label: "breakfast" | "lunch" | "dinner" }[] = [
      { hour: 8, label: "breakfast" },
      { hour: 12.5, label: "lunch" },
      { hour: 19, label: "dinner" },
    ];

    for (const slot of mealSlots) {
      const loggedAt = new Date(dayStart.getTime() + slot.hour * HOUR + (rand() - 0.5) * 30 * 60 * 1000);
      const ingredientCategoryKeys: string[] = [];
      const contextFactorKeys: ContextFactorKey[] = [];
      let portionSize: PortionSize = rand() < 0.15 ? "large" : rand() < 0.5 ? "medium" : "small";

      const isDinner = slot.label === "dinner";
      const hasCarbonated = isDinner && rand() < 0.45;
      if (hasCarbonated) contextFactorKeys.push("carbonated_drink");

      const hasDairy = slot.label === "lunch" && rand() < 0.24;
      if (hasDairy) ingredientCategoryKeys.push("dairy");

      if (rand() < 0.1) ingredientCategoryKeys.push("leafy_greens");
      if (rand() < 0.08) ingredientCategoryKeys.push("lean_protein");

      const meal: InternalMeal = {
        id: genId("meal"),
        userId: "demo-user",
        loggedAt: loggedAt.toISOString(),
        createdAt: loggedAt.toISOString(),
        portionSize,
        notes: null,
        source: "manual",
        ingredientCategoryKeys,
        contextFactorKeys,
      };
      meals.push(meal);

      // Symptom generation, seeded to create the two associations above.
      let severity: number | null = null;
      if (hasCarbonated && rand() < 0.78) severity = rand() < 0.6 ? 4 : 3;
      else if (hasDairy && rand() < 0.55) severity = rand() < 0.5 ? 3 : 2;
      else if (rand() < 0.12) severity = rand() < 0.5 ? 2 : 1;

      if (severity !== null) {
        const onsetHours = 1 + rand() * 2.5;
        const occurredAt = new Date(loggedAt.getTime() + onsetHours * HOUR);
        symptoms.push({
          id: genId("symptom"),
          userId: "demo-user",
          occurredAt: occurredAt.toISOString(),
          createdAt: occurredAt.toISOString(),
          severity: severity as 0 | 1 | 2 | 3 | 4 | 5,
          types: severity >= 3 ? ["tightness", "fullness"] : ["gas"],
          notes: null,
          redFlags: [],
        });
      }
    }
  }

  return { meals, symptoms };
}

export class MockRepository implements BloatRepository {
  private profile: UserProfile;
  private meals: InternalMeal[];
  private symptoms: SymptomEvent[];
  private experiments: Experiment[] = [];
  private subscriptionTier: SubscriptionTier = "free";

  constructor() {
    const baselineStartedAt = new Date(Date.now() - 21 * DAY);
    const { meals, symptoms } = seedHistory(baselineStartedAt);
    this.meals = meals;
    this.symptoms = symptoms;
    this.profile = {
      id: "demo-user",
      createdAt: baselineStartedAt.toISOString(),
      displayName: "Sarah",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
      onboarding: null,
      baselineStartedAt: baselineStartedAt.toISOString(),
      baselineComplete: true,
    };
  }

  // -- profile / onboarding ---------------------------------------------

  async getProfile(): Promise<UserProfile> {
    return this.profile;
  }

  async saveOnboarding(answers: OnboardingAnswers): Promise<void> {
    this.profile = { ...this.profile, onboarding: answers };
  }

  async startBaseline(): Promise<void> {
    this.profile = {
      ...this.profile,
      baselineStartedAt: this.profile.baselineStartedAt ?? new Date().toISOString(),
    };
  }

  /** Dev/demo convenience, not part of the core interface: simulates a
   * brand-new install so the onboarding flow can be reviewed on demand. */
  async resetForDemo(): Promise<void> {
    this.profile = { ...this.profile, onboarding: null, baselineStartedAt: null, baselineComplete: false };
    this.meals = [];
    this.symptoms = [];
    this.experiments = [];
  }

  // -- today ---------------------------------------------------------------

  async getTodayStatus(): Promise<TodayStatus> {
    const now = new Date();
    const todayKey = dateKey(now);
    const todaysMeals = this.meals.filter((m) => dateKey(new Date(m.loggedAt)) === todayKey);

    const mealsLoggedToday = {
      breakfast: todaysMeals.some((m) => new Date(m.loggedAt).getHours() < 11),
      lunch: todaysMeals.some((m) => {
        const h = new Date(m.loggedAt).getHours();
        return h >= 11 && h < 16;
      }),
      dinner: todaysMeals.some((m) => new Date(m.loggedAt).getHours() >= 16),
    };
    const eveningCheckinLoggedToday = this.symptoms.some((s) => dateKey(new Date(s.occurredAt)) === todayKey);

    const baselineStartedAt = this.profile.baselineStartedAt ? new Date(this.profile.baselineStartedAt) : now;
    const baselineDayNumber = Math.max(1, Math.floor((now.getTime() - baselineStartedAt.getTime()) / DAY) + 1);

    const totalMeals = this.meals.length;
    const patternConfidenceDots = Math.max(0, Math.min(5, Math.floor(totalMeals / 8)));
    const labels = ["Getting started", "Getting started", "Building signal", "Building signal", "Good coverage", "Strong coverage"];

    return {
      baselineDayNumber,
      baselineComplete: this.profile.baselineComplete,
      mealsLoggedToday,
      eveningCheckinLoggedToday,
      patternConfidenceDots,
      patternConfidenceLabel: labels[patternConfidenceDots],
    };
  }

  // -- meals -----------------------------------------------------------

  async logMeal(input: LogMealInput): Promise<Meal> {
    const loggedAt = input.loggedAt ?? new Date();
    const ingredientCategoryKeys = Array.from(
      new Set(input.ingredientLabels.map((i) => i.categoryKey).filter((k): k is string => !!k))
    );
    const meal: InternalMeal = {
      id: genId("meal"),
      userId: this.profile.id,
      loggedAt: loggedAt.toISOString(),
      createdAt: new Date().toISOString(),
      portionSize: input.portionSize,
      notes: input.freeTextAddition ?? null,
      source: input.source,
      ingredientCategoryKeys,
      contextFactorKeys: input.contextFactorKeys ?? [],
    };
    this.meals.push(meal);
    return meal;
  }

  async getMeals(sinceDays?: number): Promise<Meal[]> {
    const cutoff = sinceDays ? Date.now() - sinceDays * DAY : 0;
    return [...this.meals]
      .filter((m) => new Date(m.loggedAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
  }

  // -- symptoms --------------------------------------------------------

  async logSymptom(input: LogSymptomInput): Promise<SymptomEvent> {
    const symptom: SymptomEvent = {
      id: genId("symptom"),
      userId: this.profile.id,
      occurredAt: (input.occurredAt ?? new Date()).toISOString(),
      createdAt: new Date().toISOString(),
      severity: input.severity,
      types: input.types,
      notes: input.notes ?? null,
      redFlags: input.redFlags ?? [],
    };
    this.symptoms.push(symptom);
    return symptom;
  }

  async getSymptoms(sinceDays?: number): Promise<SymptomEvent[]> {
    const cutoff = sinceDays ? Date.now() - sinceDays * DAY : 0;
    return [...this.symptoms]
      .filter((s) => new Date(s.occurredAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }

  // -- patterns ----------------------------------------------------------

  private buildObservations(): { mealObs: MealObservation[]; symptomObs: SymptomObservation[] } {
    const mealObs: MealObservation[] = this.meals.map((m) => ({
      mealId: m.id,
      loggedAt: new Date(m.loggedAt),
      factors: deriveMealFactors({
        portionSize: m.portionSize,
        ingredientCategoryKeys: m.ingredientCategoryKeys,
        contextFactorKeys: m.contextFactorKeys,
        loggedAt: new Date(m.loggedAt),
      }),
    }));
    const symptomObs: SymptomObservation[] = this.symptoms.map((s) => ({
      symptomId: s.id,
      occurredAt: new Date(s.occurredAt),
      severity: s.severity,
    }));
    return { mealObs, symptomObs };
  }

  async getPatterns(): Promise<PatternListItem[]> {
    const { mealObs, symptomObs } = this.buildObservations();
    const evidence = rankFactorEvidence(analyzeCandidateFactors(mealObs, symptomObs));
    return evidence.map((e) => ({
      id: `${e.factor.type}:${e.factor.key}`,
      confidence: e.confidence,
      evidence: e,
      summary: insightExplainer.explainPattern(e),
    }));
  }

  async getPattern(id: string): Promise<PatternListItem | null> {
    const all = await this.getPatterns();
    return all.find((p) => p.id === id) ?? null;
  }

  // -- experiments -------------------------------------------------------

  async startExperiment(patternId: string, durationDays = 7): Promise<Experiment> {
    const pattern = await this.getPattern(patternId);
    if (!pattern) throw new Error(`Unknown pattern: ${patternId}`);

    const now = new Date();
    const baselineWindowDays = 14;
    const dailyAverages = this.dailySeverityAverages(new Date(now.getTime() - baselineWindowDays * DAY), now);
    const baselineAvgSeverity =
      dailyAverages.length > 0 ? dailyAverages.reduce((s, v) => s + v, 0) / dailyAverages.length : 0;

    const experiment: Experiment = {
      id: genId("experiment"),
      userId: this.profile.id,
      patternId,
      title: `Skip ${pattern.evidence.factor.label.toLowerCase()}`,
      factor: pattern.evidence.factor,
      startedAt: now.toISOString(),
      endsAt: new Date(now.getTime() + durationDays * DAY).toISOString(),
      durationDays,
      status: "active",
      baselineAvgSeverity: Math.round(baselineAvgSeverity * 100) / 100,
    };
    this.experiments.push(experiment);
    return experiment;
  }

  private dailySeverityAverages(from: Date, to: Date): number[] {
    const byDay = new Map<string, number[]>();
    for (const s of this.symptoms) {
      const occurred = new Date(s.occurredAt);
      if (occurred < from || occurred > to) continue;
      const key = dateKey(occurred);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(s.severity);
    }
    const days: number[] = [];
    for (let d = startOfDay(from).getTime(); d <= to.getTime(); d += DAY) {
      const key = dateKey(new Date(d));
      const values = byDay.get(key);
      days.push(values && values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0);
    }
    return days;
  }

  private buildObservationsForExperiment(experiment: Experiment): ExperimentObservation[] {
    const start = new Date(experiment.startedAt);
    const now = new Date();
    const end = now < new Date(experiment.endsAt) ? now : new Date(experiment.endsAt);

    const byDay = new Map<string, number[]>();
    for (const s of this.symptoms) {
      const occurred = new Date(s.occurredAt);
      if (occurred < start || occurred > end) continue;
      const key = dateKey(occurred);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(s.severity);
    }

    const observations: ExperimentObservation[] = [];
    for (let d = startOfDay(start).getTime(); d <= end.getTime(); d += DAY) {
      const key = dateKey(new Date(d));
      const values = byDay.get(key);
      observations.push({
        id: genId("obs"),
        experimentId: experiment.id,
        date: key,
        avgSeverity: values && values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : values ? 0 : null,
        symptomCount: values?.length ?? 0,
        adheredToExperiment: true,
      });
    }
    return observations;
  }

  private async withProgress(experiment: Experiment): Promise<ExperimentWithProgress> {
    const now = new Date();
    const start = new Date(experiment.startedAt);
    const dayNumber = Math.min(
      experiment.durationDays,
      Math.max(1, Math.floor((now.getTime() - start.getTime()) / DAY) + 1)
    );
    const observations = this.buildObservationsForExperiment(experiment);
    const baselineWindowDays = 14;
    const baselineDailyAverages = this.dailySeverityAverages(
      new Date(start.getTime() - baselineWindowDays * DAY),
      start
    );
    const comparison = observations.some((o) => o.avgSeverity !== null)
      ? compareExperimentToBaseline(baselineDailyAverages, observations, experiment.factor.label)
      : null;
    return { experiment, dayNumber, comparison };
  }

  async getActiveExperiment(): Promise<ExperimentWithProgress | null> {
    const active = this.experiments.find((e) => e.status === "active");
    return active ? this.withProgress(active) : null;
  }

  async getExperiment(id: string): Promise<ExperimentWithProgress | null> {
    const experiment = this.experiments.find((e) => e.id === id);
    return experiment ? this.withProgress(experiment) : null;
  }

  async finishExperiment(id: string, status: ExperimentStatus): Promise<void> {
    this.experiments = this.experiments.map((e) => (e.id === id ? { ...e, status } : e));
  }

  // -- subscription --------------------------------------------------------

  async getSubscriptionTier(): Promise<SubscriptionTier> {
    return this.subscriptionTier;
  }

  async setSubscriptionTier(tier: SubscriptionTier): Promise<void> {
    this.subscriptionTier = tier;
  }
}

export const mockRepository = new MockRepository();
