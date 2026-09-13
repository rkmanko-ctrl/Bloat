import type { FactorEvidence } from "../patternEngine/types";
import type { ExperimentComparison } from "../patternEngine/experiment";
import type {
  ContextFactorKey,
  Experiment,
  ExperimentStatus,
  Meal,
  OnboardingAnswers,
  PatternConfidence,
  PortionSize,
  RedFlagSymptom,
  SubscriptionTier,
  SymptomEvent,
  SymptomType,
  UserProfile,
} from "../types";

export interface TodayStatus {
  baselineDayNumber: number;
  baselineComplete: boolean;
  mealsLoggedToday: { breakfast: boolean; lunch: boolean; dinner: boolean };
  eveningCheckinLoggedToday: boolean;
  /** 0-5 dots, shown on the Today screen's "Pattern confidence" card. */
  patternConfidenceDots: number;
  patternConfidenceLabel: string;
}

export interface LogMealInput {
  loggedAt?: Date;
  portionSize: PortionSize;
  source: "photo" | "manual";
  photoUri?: string;
  ingredientLabels: { label: string; categoryKey: string | null }[];
  freeTextAddition?: string;
  contextFactorKeys?: ContextFactorKey[];
}

export interface LogSymptomInput {
  occurredAt?: Date;
  severity: 0 | 1 | 2 | 3 | 4 | 5;
  types: SymptomType[];
  notes?: string;
  redFlags?: RedFlagSymptom[];
}

export interface PatternListItem {
  id: string;
  confidence: PatternConfidence;
  evidence: FactorEvidence;
  summary: string;
}

export interface ExperimentWithProgress {
  experiment: Experiment;
  dayNumber: number; // 1-indexed, capped at durationDays
  comparison: ExperimentComparison | null; // null until >=1 day of data
}

/**
 * The single interface every screen talks to. `MockRepository` (used today)
 * and a future `SupabaseRepository` both implement this, so swapping the
 * backend never touches screen code.
 */
export interface BloatRepository {
  getProfile(): Promise<UserProfile>;
  saveOnboarding(answers: OnboardingAnswers): Promise<void>;
  startBaseline(): Promise<void>;

  getTodayStatus(): Promise<TodayStatus>;

  logMeal(input: LogMealInput): Promise<Meal>;
  getMeals(sinceDays?: number): Promise<Meal[]>;

  logSymptom(input: LogSymptomInput): Promise<SymptomEvent>;
  getSymptoms(sinceDays?: number): Promise<SymptomEvent[]>;

  getPatterns(): Promise<PatternListItem[]>;
  getPattern(id: string): Promise<PatternListItem | null>;

  startExperiment(patternId: string, durationDays?: number): Promise<Experiment>;
  getActiveExperiment(): Promise<ExperimentWithProgress | null>;
  getExperiment(id: string): Promise<ExperimentWithProgress | null>;
  finishExperiment(id: string, status: ExperimentStatus): Promise<void>;

  getSubscriptionTier(): Promise<SubscriptionTier>;
  setSubscriptionTier(tier: SubscriptionTier): Promise<void>;
}
