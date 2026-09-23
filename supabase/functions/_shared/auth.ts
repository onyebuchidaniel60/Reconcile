// Server-side Supabase helpers for Edge Functions (Deno).
// NOT unit-tested (requires live Supabase); covered by skipped-live
// integration tests. Uses the service-role key from function secrets only.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { errResponse } from "./envelope.ts";

export interface AuthedContext {
  client: SupabaseClient;
  userId: string;
}

function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolve the caller from the Authorization JWT. Never trust a client user id. */
export async function requireUser(
  req: Request,
): Promise<AuthedContext | Response> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return errResponse(401, "UNAUTHENTICATED", "Please sign in and try again.", false);
  }
  let client: SupabaseClient;
  try {
    client = serviceClient();
  } catch {
    return errResponse(
      500,
      "SERVER_MISCONFIGURED",
      "The service is not configured. Please try again later.",
      false,
    );
  }
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return errResponse(401, "UNAUTHENTICATED", "Please sign in and try again.", false);
  }
  return { client, userId: data.user.id };
}
