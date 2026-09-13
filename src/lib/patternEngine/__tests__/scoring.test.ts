import type { CandidateFactor } from "../../types";
import { analyzeCandidateFactors } from "../scoring";
import { DEFAULT_CONFIG, type MealObservation, type SymptomObservation } from "../types";

const BASE = new Date("2026-01-01T08:00:00Z").getTime();
const HOUR = 60 * 60 * 1000;

const carbonated: CandidateFactor = { type: "context_factor", key: "carbonated_drink", label: "Carbonated drinks" };
const dairy: CandidateFactor = { type: "ingredient_category", key: "dairy", label: "Dairy" };

function meal(id: string, hourOffset: number, factors: CandidateFactor[]): MealObservation {
  return { mealId: id, loggedAt: new Date(BASE + hourOffset * HOUR), factors };
}

function symptom(id: string, hourOffset: number, severity: number): SymptomObservation {
  return { symptomId: id, occurredAt: new Date(BASE + hourOffset * HOUR), severity };
}

describe("analyzeCandidateFactors", () => {
  it("surfaces a strong pattern matching the worked example from the product spec", () => {
    // 10 carbonated meals, 8 followed by moderate+ bloating ~2h later.
    // 12 non-carbonated meals, 3 followed by moderate+ bloating ~2h later.
    // Meals are spaced 8h apart so symptom windows (4h) never overlap.
    const meals: MealObservation[] = [];
    const symptoms: SymptomObservation[] = [];
    let hour = 0;

    for (let i = 0; i < 10; i++) {
      meals.push(meal(`c${i}`, hour, [carbonated]));
      if (i < 8) symptoms.push(symptom(`sc${i}`, hour + 2, 3));
      hour += 8;
    }
    for (let i = 0; i < 12; i++) {
      meals.push(meal(`n${i}`, hour, []));
      if (i < 3) symptoms.push(symptom(`sn${i}`, hour + 2, 3));
      hour += 8;
    }

    const results = analyzeCandidateFactors(meals, symptoms);
    const carbonatedResult = results.find((r) => r.factor.key === "carbonated_drink");

    expect(carbonatedResult).toBeDefined();
    expect(carbonatedResult!.exposedCount).toBe(10);
    expect(carbonatedResult!.exposedSymptomCount).toBe(8);
    expect(carbonatedResult!.unexposedCount).toBe(12);
    expect(carbonatedResult!.unexposedSymptomCount).toBe(3);
    expect(carbonatedResult!.confidence).toBe("stronger_pattern");
    expect(carbonatedResult!.pValue).not.toBeNull();
    expect(carbonatedResult!.pValue as number).toBeLessThan(0.05);
    expect(carbonatedResult!.medianOnsetHours).toBeCloseTo(2, 5);
    // Strongest pattern should rank first.
    expect(results[0].factor.key).toBe("carbonated_drink");
  });

  it("caps confidence at early_signal when sample size is too small, even with a big observed gap", () => {
    const meals: MealObservation[] = [];
    const symptoms: SymptomObservation[] = [];
    let hour = 0;

    // Only 3 exposed occasions — below minExposedForConclusion (5).
    for (let i = 0; i < 3; i++) {
      meals.push(meal(`d${i}`, hour, [dairy]));
      symptoms.push(symptom(`sd${i}`, hour + 2, 4));
      hour += 8;
    }
    for (let i = 0; i < 6; i++) {
      meals.push(meal(`n${i}`, hour, []));
      hour += 8;
    }

    const results = analyzeCandidateFactors(meals, symptoms);
    const dairyResult = results.find((r) => r.factor.key === "dairy");

    expect(dairyResult).toBeDefined();
    expect(dairyResult!.confidence).toBe("early_signal");
  });

  it("does not surface a factor with essentially no association once well sampled", () => {
    const meals: MealObservation[] = [];
    const symptoms: SymptomObservation[] = [];
    let hour = 0;

    // Symptom rate ~equal in both groups (5/10 vs 5/10) with plenty of data.
    for (let i = 0; i < 10; i++) {
      meals.push(meal(`d${i}`, hour, [dairy]));
      if (i < 5) symptoms.push(symptom(`sd${i}`, hour + 2, 3));
      hour += 8;
    }
    for (let i = 0; i < 10; i++) {
      meals.push(meal(`n${i}`, hour, []));
      if (i < 5) symptoms.push(symptom(`sn${i}`, hour + 2, 3));
      hour += 8;
    }

    const results = analyzeCandidateFactors(meals, symptoms);
    expect(results.find((r) => r.factor.key === "dairy")).toBeUndefined();
  });

  it("ignores factors with fewer occasions than minOccasionsToSurface", () => {
    const meals: MealObservation[] = [
      meal("d0", 0, [dairy]),
      meal("d1", 8, [dairy]),
      meal("n0", 16, []),
      meal("n1", 24, []),
      meal("n2", 32, []),
    ];
    const results = analyzeCandidateFactors(meals, []);
    expect(results.find((r) => r.factor.key === "dairy")).toBeUndefined();
  });

  it("skips a factor with no comparison group", () => {
    const meals: MealObservation[] = [meal("d0", 0, [dairy]), meal("d1", 8, [dairy]), meal("d2", 16, [dairy])];
    const results = analyzeCandidateFactors(meals, []);
    expect(results.find((r) => r.factor.key === "dairy")).toBeUndefined();
  });

  it("attributes a symptom to the nearest preceding meal, not every meal in range", () => {
    // Two carbonated meals close together, one symptom shortly after the
    // second — should only count against the second meal.
    const meals: MealObservation[] = [
      meal("c0", 0, [carbonated]),
      meal("c1", 1, [carbonated]),
      meal("n0", 20, []),
      meal("n1", 28, []),
      meal("n2", 36, []),
    ];
    const symptoms: SymptomObservation[] = [symptom("s0", 1.5, 3)];

    const results = analyzeCandidateFactors(meals, symptoms, {
      ...DEFAULT_CONFIG,
      minOccasionsToSurface: 2,
      minExposedForConclusion: 2,
      minUnexposedForConclusion: 2,
    });
    const carbonatedResult = results.find((r) => r.factor.key === "carbonated_drink");
    expect(carbonatedResult).toBeDefined();
    expect(carbonatedResult!.exposedSymptomCount).toBe(1); // not 2
  });
});
