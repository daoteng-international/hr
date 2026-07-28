import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// createClient() validates its arguments eagerly — it throws synchronously on
// an empty/malformed URL or an empty key. A blank env var would therefore
// crash this module at *import* time (e.g. a serverless cold start before
// env vars are configured), taking down every route including /health, not
// just the ones that actually touch Supabase. Substituting a syntactically
// valid but unreachable placeholder keeps import side-effect-free; any call
// made against a placeholder client then fails at the network call (a normal
// per-request error) instead of at module load.
const PLACEHOLDER_URL = "https://placeholder.invalid"
const PLACEHOLDER_KEY = "missing-supabase-credential"

const url = process.env.SUPABASE_URL || PLACEHOLDER_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_KEY
const anonKey = process.env.SUPABASE_ANON_KEY || PLACEHOLDER_KEY

/**
 * Admin client backed by the service_role key. Bypasses RLS — use only on the
 * server for trusted, tenant-scoped queries where the API itself enforces the
 * tenant boundary (the second line of defence alongside DB RLS).
 *
 * We do NOT throw at import time when env vars are missing so that the module
 * can be imported in test/build/serverless environments without live
 * credentials.
 */
export const supabaseAdmin: SupabaseClient = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
})

/**
 * Anon client used purely to validate a user's access token via getUser().
 * It carries no elevated privileges.
 */
const supabaseAnon: SupabaseClient = createClient(url, anonKey, {
  auth: { persistSession: false },
})

export interface AuthedUser {
  userId: string
  email: string | null
  appMetadata: Record<string, unknown>
}

/**
 * Resolve a Supabase access token to the underlying user. Returns null when the
 * token is missing or invalid, so callers can map that to a 401.
 */
export async function getUserFromToken(token: string): Promise<AuthedUser | null> {
  if (!token) return null
  const {
    data: { user },
    error,
  } = await supabaseAnon.auth.getUser(token)
  if (error || !user) return null
  return {
    userId: user.id,
    email: user.email ?? null,
    appMetadata: user.app_metadata ?? {},
  }
}
