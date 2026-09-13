import { supabase } from "../supabase";
import type {
  Experiment,
  ExperimentStatus,
  Meal,
  OnboardingAnswers,
  SubscriptionTier,
  SymptomEvent,
  UserProfile,
} from "../types";
import type {
  BloatRepository,
  ExperimentWithProgress,
  LogMealInput,
  LogSymptomInput,
  PatternListItem,
  TodayStatus,
} from "./types";

/**
 * Sketch of the production repository. Simple CRUD (meals, symptoms,
 * profile) maps directly onto Supabase tables with RLS, as shown below.
 *
 * Pattern detection and experiment comparison, however, are NOT computed
 * client-side against a live Supabase project: they should run as a
 * Supabase Edge Function (service role) that pulls a user's meals/symptoms,
 * runs `analyzeCandidateFactors` (src/lib/patternEngine — the exact same
 * pure function used in MockRepository, so behavior never diverges between
 * mock and production), writes the result into `patterns` +
 * `pattern_evidence`, and returns it. That keeps the scoring logic in one
 * place, lets it run on a schedule (e.g. nightly, or after N new logs)
 * instead of on every screen load, and matches the "server decides,
 * client displays" posture the schema's RLS policies assume (clients can
 * only INSERT/SELECT their own raw observations; only the service role
 * writes to `patterns`).
 *
 * This class is not wired into the app (see repository/index.ts) — it's
 * left here as the intended shape for whoever connects a real Supabase
 * project, rather than a fully working implementation with nothing to test
 * it against.
 */
export class SupabaseRepository implements BloatRepository {
  private requireClient() {
    if (!supabase) throw new Error("Supabase is not configured — set EXPO_PUBLIC_SUPABASE_URL / ANON_KEY");
    return supabase;
  }

  async getProfile(): Promise<UserProfile> {
    const client = this.requireClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");
    const { data, error } = await client.from("users").select("*").eq("id", auth.user.id).single();
    if (error) throw error;
    return {
      id: data.id,
      createdAt: data.created_at,
      displayName: data.display_name,
      timezone: data.timezone,
      onboarding: data.onboarding,
      baselineStartedAt: data.baseline_started_at,
      baselineComplete: data.baseline_complete,
    };
  }

  async saveOnboarding(answers: OnboardingAnswers): Promise<void> {
    const client = this.requireClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");
    const { error } = await client.from("users").update({ onboarding: answers }).eq("id", auth.user.id);
    if (error) throw error;
  }

  async startBaseline(): Promise<void> {
    const client = this.requireClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");
    const { error } = await client
      .from("users")
      .update({ baseline_started_at: new Date().toISOString() })
      .eq("id", auth.user.id);
    if (error) throw error;
  }

  async logMeal(input: LogMealInput): Promise<Meal> {
    const client = this.requireClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const { data: meal, error } = await client
      .from("meals")
      .insert({
        user_id: auth.user.id,
        logged_at: (input.loggedAt ?? new Date()).toISOString(),
        portion_size: input.portionSize,
        notes: input.freeTextAddition ?? null,
        source: input.source,
      })
      .select()
      .single();
    if (error) throw error;

    if (input.ingredientLabels.length > 0) {
      const { error: ingredientsError } = await client.from("meal_ingredients").insert(
        input.ingredientLabels.map((i) => ({
          meal_id: meal.id,
          raw_label: i.label,
          source: input.source === "photo" ? "vision" : "user_added",
        }))
      );
      if (ingredientsError) throw ingredientsError;
    }

    if (input.contextFactorKeys && input.contextFactorKeys.length > 0) {
      const { error: contextError } = await client.from("context_factors").insert(
        input.contextFactorKeys.map((key) => ({
          user_id: auth.user!.id,
          meal_id: meal.id,
          occurred_at: meal.logged_at,
          key,
        }))
      );
      if (contextError) throw contextError;
    }

    return {
      id: meal.id,
      userId: meal.user_id,
      loggedAt: meal.logged_at,
      createdAt: meal.created_at,
      portionSize: meal.portion_size,
      notes: meal.notes,
      source: meal.source,
    };
  }

  async getMeals(sinceDays?: number): Promise<Meal[]> {
    const client = this.requireClient();
    let query = client.from("meals").select("*").order("logged_at", { ascending: false });
    if (sinceDays) query = query.gte("logged_at", new Date(Date.now() - sinceDays * 86400000).toISOString());
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((m) => ({
      id: m.id,
      userId: m.user_id,
      loggedAt: m.logged_at,
      createdAt: m.created_at,
      portionSize: m.portion_size,
      notes: m.notes,
      source: m.source,
    }));
  }

  async logSymptom(input: LogSymptomInput): Promise<SymptomEvent> {
    const client = this.requireClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");
    const { data, error } = await client
      .from("symptom_events")
      .insert({
        user_id: auth.user.id,
        occurred_at: (input.occurredAt ?? new Date()).toISOString(),
        severity: input.severity,
        types: input.types,
        notes: input.notes ?? null,
        red_flags: input.redFlags ?? [],
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      occurredAt: data.occurred_at,
      createdAt: data.created_at,
      severity: data.severity,
      types: data.types,
      notes: data.notes,
      redFlags: data.red_flags,
    };
  }

  async getSymptoms(sinceDays?: number): Promise<SymptomEvent[]> {
    const client = this.requireClient();
    let query = client.from("symptom_events").select("*").order("occurred_at", { ascending: false });
    if (sinceDays) query = query.gte("occurred_at", new Date(Date.now() - sinceDays * 86400000).toISOString());
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((s) => ({
      id: s.id,
      userId: s.user_id,
      occurredAt: s.occurred_at,
      createdAt: s.created_at,
      severity: s.severity,
      types: s.types,
      notes: s.notes,
      redFlags: s.red_flags,
    }));
  }

  // -- The following read pre-computed results written by the Edge
  // Function described above, rather than running analysis client-side.

  async getTodayStatus(): Promise<TodayStatus> {
    throw new Error("Not implemented: derive from getMeals()/getSymptoms() client-side, same as MockRepository.");
  }

  async getPatterns(): Promise<PatternListItem[]> {
    throw new Error("Not implemented: SELECT * FROM patterns JOIN pattern_evidence, written by the analysis Edge Function.");
  }

  async getPattern(_id: string): Promise<PatternListItem | null> {
    throw new Error("Not implemented: see getPatterns().");
  }

  async startExperiment(_patternId: string, _durationDays?: number): Promise<Experiment> {
    throw new Error("Not implemented: INSERT INTO experiments, baseline computed by the same Edge Function.");
  }

  async getActiveExperiment(): Promise<ExperimentWithProgress | null> {
    throw new Error("Not implemented.");
  }

  async getExperiment(_id: string): Promise<ExperimentWithProgress | null> {
    throw new Error("Not implemented.");
  }

  async finishExperiment(_id: string, _status: ExperimentStatus): Promise<void> {
    throw new Error("Not implemented.");
  }

  async getSubscriptionTier(): Promise<SubscriptionTier> {
    throw new Error("Not implemented: read from RevenueCat webhook-populated `subscriptions` table.");
  }

  async setSubscriptionTier(_tier: SubscriptionTier): Promise<void> {
    throw new Error("Not implemented: subscription state is written by the RevenueCat webhook, not the client.");
  }
}
