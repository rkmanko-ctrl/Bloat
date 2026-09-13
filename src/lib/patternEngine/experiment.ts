import type { ExperimentObservation } from "../types";
import { mean } from "./stats";

export interface ExperimentComparison {
  baselineAvgSeverity: number;
  experimentAvgSeverity: number;
  baselineHighEpisodeCount: number; // days with avg severity >= 3
  experimentHighEpisodeCount: number;
  daysObserved: number;
  /** A meaningful, but deliberately modest, improvement threshold. We only
   * call an experiment "improved" when the drop is large enough that it's
   * unlikely to just be day-to-day noise, per section 13's instruction not
   * to overinterpret small or incomplete experiments. */
  improved: boolean;
  interpretation: string;
}

const MEANINGFUL_IMPROVEMENT = 0.75; // absolute drop in avg severity (0-5 scale)
const HIGH_SEVERITY_THRESHOLD = 3;
const MIN_DAYS_FOR_VERDICT = 5;

export function compareExperimentToBaseline(
  baselineDailyAverages: number[],
  observations: ExperimentObservation[],
  factorLabel: string
): ExperimentComparison {
  const daysWithData = observations.filter((o) => o.avgSeverity !== null);
  const experimentAvgSeverity = mean(daysWithData.map((o) => o.avgSeverity as number));
  const experimentHighEpisodeCount = daysWithData.filter((o) => (o.avgSeverity as number) >= HIGH_SEVERITY_THRESHOLD).length;
  const baselineAvgSeverity = mean(baselineDailyAverages);
  const baselineHighEpisodeCount = baselineDailyAverages.filter((v) => v >= HIGH_SEVERITY_THRESHOLD).length;

  const daysObserved = daysWithData.length;
  const drop = baselineAvgSeverity - experimentAvgSeverity;

  let interpretation: string;
  let improved = false;

  if (daysObserved < MIN_DAYS_FOR_VERDICT) {
    interpretation = "Not enough days logged yet to draw a conclusion. Keep logging through the end of the experiment.";
  } else if (drop >= MEANINGFUL_IMPROVEMENT) {
    improved = true;
    interpretation =
      `This doesn't prove ${factorLabel.toLowerCase()} is the cause. But the difference is large enough that ` +
      `this pattern may be useful for you.`;
  } else if (drop <= -MEANINGFUL_IMPROVEMENT) {
    interpretation = `Symptoms during this experiment were similar to or higher than your baseline. ${factorLabel} may not be a major factor for you.`;
  } else {
    interpretation = `Symptoms during this experiment were close to your baseline. This doesn't rule ${factorLabel.toLowerCase()} out, but the effect — if any — appears small.`;
  }

  return {
    baselineAvgSeverity,
    experimentAvgSeverity,
    baselineHighEpisodeCount,
    experimentHighEpisodeCount,
    daysObserved,
    improved,
    interpretation,
  };
}
