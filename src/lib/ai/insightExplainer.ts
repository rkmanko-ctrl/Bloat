import type { FactorEvidence } from "../patternEngine/types";
import type { ExperimentComparison } from "../patternEngine/experiment";

/**
 * Turns evidence computed by the deterministic pattern engine into plain
 * English (section 14). This layer NEVER computes statistics itself and
 * never introduces numbers that aren't already in the evidence object —
 * its only job is wording, in 1-3 short sentences, that:
 *   - states an association, never a cause ("bloating was logged more
 *     often after..." not "X causes your bloating")
 *   - acknowledges uncertainty when the sample is still small
 *
 * In production, `explainPattern`/`explainExperimentResult` would call an
 * LLM with a tightly constrained prompt: "Given ONLY these numbers, write
 * 1-3 sentences in this style — do not add any figures not listed below."
 * The mock implementation below is a template so the app works end-to-end
 * without an LLM call, and so the exact wording is auditable/testable.
 */

export interface InsightExplainer {
  explainPattern(evidence: FactorEvidence): string;
  explainExperimentResult(comparison: ExperimentComparison, factorLabel: string): string;
}

function formatCount(n: number, symptomatic: number): string {
  return `${symptomatic} of ${n}`;
}

export class TemplateInsightExplainer implements InsightExplainer {
  explainPattern(evidence: FactorEvidence): string {
    const { factor, exposedCount, exposedSymptomCount, unexposedCount, unexposedSymptomCount, confidence } = evidence;
    const label = factor.label.toLowerCase();

    if (confidence === "early_signal") {
      return `We've started noticing bloating after some meals involving ${label}, but there isn't enough data yet to say much. Keep logging and we'll keep watching.`;
    }

    const exposedStr = formatCount(exposedCount, exposedSymptomCount);
    const unexposedStr = formatCount(unexposedCount, unexposedSymptomCount);
    const timing =
      evidence.onsetHoursRange !== null
        ? ` Bloating has typically shown up ${Math.round(evidence.onsetHoursRange[0])}-${Math.round(
            evidence.onsetHoursRange[1]
          )} hours later.`
        : "";

    if (confidence === "stronger_pattern") {
      return (
        `Bloating has been logged notably more often after meals involving ${label} — ${exposedStr} occasions, ` +
        `compared with ${unexposedStr} without them.${timing} There isn't enough evidence to say ${label} is ` +
        `responsible, but this pattern may be worth testing.`
      );
    }

    return (
      `We've noticed a possible pattern involving ${label}: bloating was logged after ${exposedStr} such meals, ` +
      `versus ${unexposedStr} meals without.${timing} This may be worth testing further.`
    );
  }

  explainExperimentResult(comparison: ExperimentComparison, factorLabel: string): string {
    // The rule-based interpretation already lives in compareExperimentToBaseline
    // (src/lib/patternEngine/experiment.ts) — that's the source of truth.
    // This just re-surfaces it so callers have one place to get insight text.
    return comparison.interpretation;
  }
}

export const insightExplainer: InsightExplainer = new TemplateInsightExplainer();
