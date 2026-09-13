import { mockRepository } from "./mockRepository";
import type { BloatRepository } from "./types";

export * from "./types";
export { MockRepository, mockRepository } from "./mockRepository";
export { SupabaseRepository } from "./supabaseRepository";

/**
 * Single source of truth for "which backend is the app talking to."
 * Everything in src/screens imports `repository` from here — never
 * MockRepository or SupabaseRepository directly — so wiring up Supabase
 * for real is a one-line change once a project exists.
 */
export const repository: BloatRepository = mockRepository;
