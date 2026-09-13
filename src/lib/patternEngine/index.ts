import type { PatternConfidence } from "../types";

export * from "./types";
export * from "./stats";
export * from "./scoring";
export * from "./experiment";

/** Copy shown in the Patterns list (section 10) for each confidence tier. */
export const CONFIDENCE_COPY: Record<PatternConfidence, { label: string; description: string }> = {
  early_signal: {
    label: "Early signal",
    description: "We need more observations before drawing a useful conclusion.",
  },
  possible_pattern: {
    label: "Possible pattern",
    description: "This pattern may be worth testing.",
  },
  stronger_pattern: {
    label: "Strongest current pattern",
    description: "Bloating has been logged notably more often after this.",
  },
};
