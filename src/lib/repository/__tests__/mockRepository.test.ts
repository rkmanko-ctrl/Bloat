import { MockRepository } from "../mockRepository";

describe("MockRepository", () => {
  it("seeds enough history that the carbonated-drink pattern surfaces", async () => {
    const repo = new MockRepository();
    const patterns = await repo.getPatterns();

    expect(patterns.length).toBeGreaterThan(0);
    const carbonated = patterns.find((p) => p.evidence.factor.key === "carbonated_drink");
    expect(carbonated).toBeDefined();
    expect(["possible_pattern", "stronger_pattern"]).toContain(carbonated!.confidence);
    expect(carbonated!.summary.length).toBeGreaterThan(0);
    // Patterns should be ranked strongest first.
    expect(patterns[0].evidence.effectSize).toBeGreaterThanOrEqual(patterns[patterns.length - 1].evidence.effectSize);
  });

  it("logs a meal and a symptom and reflects them in getMeals/getSymptoms", async () => {
    const repo = new MockRepository();
    const before = await repo.getMeals();

    await repo.logMeal({
      portionSize: "medium",
      source: "manual",
      ingredientLabels: [{ label: "Yogurt", categoryKey: "dairy" }],
    });
    const after = await repo.getMeals();
    expect(after.length).toBe(before.length + 1);

    const symptom = await repo.logSymptom({ severity: 3, types: ["fullness"] });
    const symptoms = await repo.getSymptoms();
    expect(symptoms.find((s) => s.id === symptom.id)).toBeDefined();
  });

  it("computes today's status without throwing and with sane bounds", async () => {
    const repo = new MockRepository();
    const status = await repo.getTodayStatus();
    expect(status.baselineDayNumber).toBeGreaterThanOrEqual(1);
    expect(status.patternConfidenceDots).toBeGreaterThanOrEqual(0);
    expect(status.patternConfidenceDots).toBeLessThanOrEqual(5);
  });

  it("runs a full experiment lifecycle", async () => {
    const repo = new MockRepository();
    const patterns = await repo.getPatterns();
    const target = patterns[0];

    const experiment = await repo.startExperiment(target.id, 7);
    expect(experiment.status).toBe("active");
    expect(experiment.baselineAvgSeverity).not.toBeNull();

    const active = await repo.getActiveExperiment();
    expect(active).not.toBeNull();
    expect(active!.experiment.id).toBe(experiment.id);
    expect(active!.dayNumber).toBe(1);

    await repo.finishExperiment(experiment.id, "completed");
    const afterFinish = await repo.getActiveExperiment();
    expect(afterFinish).toBeNull();
  });

  it("defaults to the free tier and allows simulating an upgrade", async () => {
    const repo = new MockRepository();
    expect(await repo.getSubscriptionTier()).toBe("free");
    await repo.setSubscriptionTier("pro");
    expect(await repo.getSubscriptionTier()).toBe("pro");
  });
});
