import type { RedFlagSymptom } from "../lib/types";

export type OnboardingStackParamList = {
  Welcome: undefined;
  BloatTiming: undefined;
  Frequency: undefined;
  SymptomType: undefined;
  Goals: undefined;
  BaselineIntro: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  Patterns: undefined;
  History: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  MealCapture: undefined;
  MealReview: { photoUri: string | null };
  BloatCheckIn: undefined;
  SafetyFlow: { redFlags: RedFlagSymptom[] };
  PatternDetail: { patternId: string };
  ExperimentStart: { patternId: string };
  ExperimentActive: { experimentId: string };
  ExperimentResult: { experimentId: string };
  Profile: undefined;
  Paywall: undefined;
};
