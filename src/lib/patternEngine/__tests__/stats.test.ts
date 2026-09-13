import { fisherExactOneSidedGreater, mean, median, percentile } from "../stats";

describe("fisherExactOneSidedGreater", () => {
  it("returns a high p-value (no evidence) for identical rates", () => {
    // 5/10 exposed symptomatic, 5/10 unexposed symptomatic — no difference.
    const p = fisherExactOneSidedGreater(5, 5, 5, 5);
    expect(p).not.toBeNull();
    expect(p as number).toBeGreaterThan(0.5);
  });

  it("returns a low p-value for a strong, well-sampled association", () => {
    // 9/10 exposed symptomatic vs 2/12 unexposed symptomatic.
    const p = fisherExactOneSidedGreater(9, 1, 2, 10);
    expect(p).not.toBeNull();
    expect(p as number).toBeLessThan(0.01);
  });

  it("returns a mid-range p-value for a small, noisy sample", () => {
    // 3/4 exposed vs 1/4 unexposed — suggestive but tiny sample.
    const p = fisherExactOneSidedGreater(3, 1, 1, 3);
    expect(p).not.toBeNull();
    expect(p as number).toBeGreaterThan(0.05);
  });

  it("is symmetric-safe: swapping which group is 'exposed' flips the conclusion", () => {
    const exposedWorse = fisherExactOneSidedGreater(8, 2, 2, 8) as number;
    const unexposedWorse = fisherExactOneSidedGreater(2, 8, 8, 2) as number;
    expect(exposedWorse).toBeLessThan(0.05);
    expect(unexposedWorse).toBeGreaterThan(0.5);
  });

  it("returns null when a group is empty", () => {
    expect(fisherExactOneSidedGreater(0, 0, 3, 4)).toBeNull();
  });

  it("stays within [0, 1] for larger sample sizes", () => {
    const p = fisherExactOneSidedGreater(40, 10, 20, 30) as number;
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe("mean/median/percentile", () => {
  it("mean of empty array is 0", () => {
    expect(mean([])).toBe(0);
  });

  it("computes mean correctly", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it("median handles even and odd length arrays", () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it("percentile interpolates between values", () => {
    expect(percentile([1, 2, 3, 4], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4], 1)).toBe(4);
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });
});
