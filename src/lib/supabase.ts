import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Lazily-created client — undefined until env vars are configured, so the
 * app can run entirely on MockRepository in local dev without a Supabase
 * project. See src/lib/repository/index.ts for how the two are switched.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = supabase !== null;
