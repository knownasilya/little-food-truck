import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Service-role client for admin operations that must always run as
// service_role: Storage uploads (lib/uploads.ts), `auth.admin.*` calls
// (createUser, updateUserById — routes/auth.ts), and any future direct
// Postgres/service-level work. `auth.admin.*` methods are safe here: they
// call Supabase's admin REST API directly with the service-role key per
// request and never touch this client's own session state.
//
// Never call session-establishing methods (signInWithPassword,
// refreshSession, signUp, setSession, ...) on THIS client. supabase-js
// propagates whatever session those establish onto the same client's
// storage/postgrest/realtime layers via its internal auth-state-change
// listener — even with persistSession/autoRefreshToken off — permanently
// swapping this client's Authorization header from the service-role key to
// that user's own access token. Since this client is a long-lived
// singleton, that then breaks every later Storage/admin call for the rest
// of the process's life, not just the request that triggered it. Use
// createSessionClient() below for anything that establishes a session.
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * A fresh, throwaway client for session-establishing auth calls
 * (signInWithPassword, refreshSession — see routes/auth.ts and
 * lib/auth.ts#withAuth). Never reuse one of these across requests or store
 * it anywhere long-lived — create one, use it once, let it be
 * garbage-collected — so a mutation to its session state can never leak
 * into another request or into supabaseAdmin above.
 */
export function createSessionClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
