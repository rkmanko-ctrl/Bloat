/**
 * Vision-based meal recognition.
 *
 * Section 14 of the product spec: the AI's job here is narrow — identify
 * items from a photo and propose normalized categories/tags. It never
 * decides what's "healthy," never estimates calories, and never runs the
 * pattern analysis itself (see src/lib/patternEngine).
 *
 * In production this calls a vision-capable model (e.g. a Claude or GPT-4o
 * class model) from a Supabase Edge Function — never directly from the
 * client, to keep API keys server-side. See supabase/functions/analyze-meal
 * (not included in this MVP scaffold) for where that call would live.
 */

export interface DetectedIngredient {
  label: string; // e.g. "chicken", "creamy sauce"
  categoryKey: string | null; // matches ingredient_categories.key, if recognized
  confidence: number; // 0-1
}

export interface MealVisionResult {
  items: DetectedIngredient[];
  /** Candidate factor tags surfaced directly to the user during review,
   * e.g. "dairy-containing", "large portion", "high-fat". */
  suggestedTags: string[];
  rawResponse: unknown;
  model: string;
}

export interface MealVisionAdapter {
  analyzePhoto(photoUri: string): Promise<MealVisionResult>;
}

/**
 * Deterministic mock so the app is fully usable (and demoable) without a
 * live AI backend. Swap this for a real HTTP call to a Supabase Edge
 * Function once one exists — the MealCaptureScreen only depends on the
 * MealVisionAdapter interface above, not on this implementation.
 */
export class MockMealVisionAdapter implements MealVisionAdapter {
  async analyzePhoto(_photoUri: string): Promise<MealVisionResult> {
    // A believable "photo of a bowl" result, matching the section 6 example.
    return {
      items: [
        { label: "Chicken", categoryKey: "lean_protein", confidence: 0.94 },
        { label: "Rice", categoryKey: null, confidence: 0.9 },
        { label: "Broccoli", categoryKey: "cruciferous_vegetables", confidence: 0.88 },
        { label: "Creamy sauce", categoryKey: "dairy", confidence: 0.72 },
      ],
      suggestedTags: ["dairy-containing", "cruciferous vegetables"],
      rawResponse: { mock: true },
      model: "mock-vision-v0",
    };
  }
}

export const mealVisionAdapter: MealVisionAdapter = new MockMealVisionAdapter();
