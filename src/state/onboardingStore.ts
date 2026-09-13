import { create } from "zustand";
import type { BloatFrequency, BloatTiming, SymptomType } from "../lib/types";

interface OnboardingState {
  bloatTiming: BloatTiming[];
  frequency: BloatFrequency | null;
  symptomTypes: SymptomType[];
  goals: string[];
  toggleBloatTiming: (v: BloatTiming) => void;
  setFrequency: (v: BloatFrequency) => void;
  toggleSymptomType: (v: SymptomType) => void;
  toggleGoal: (v: string) => void;
  reset: () => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const initial = {
  bloatTiming: [] as BloatTiming[],
  frequency: null as BloatFrequency | null,
  symptomTypes: [] as SymptomType[],
  goals: [] as string[],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initial,
  toggleBloatTiming: (v) => set((s) => ({ bloatTiming: toggle(s.bloatTiming, v) })),
  setFrequency: (v) => set({ frequency: v }),
  toggleSymptomType: (v) => set((s) => ({ symptomTypes: toggle(s.symptomTypes, v) })),
  toggleGoal: (v) => set((s) => ({ goals: toggle(s.goals, v) })),
  reset: () => set(initial),
}));
