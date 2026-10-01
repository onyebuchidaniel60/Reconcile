// Rate limiting for provider-touching Edge Functions.
//
// Backed by Postgres rather than process memory so the limit holds across
// concurrent function instances (Supabase runs many). Uses an existing table
// rather than adding a counter table: `sync_runs` already records one row per
// sync attempt per user, which is exactly the event being limited.
//
// Counting rows rather than caching a timestamp means a crashed attempt still
// counts — the conservative direction for a limit protecting a metered,
// per-page-billed upstream API.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds the caller should wait before retrying. */
  retryAfterSeconds: number;
  /** Window the limit applies to, for the error message. */
  windowSeconds: number;
}

/**
 * At most `max` attempts per `windowSeconds` for this user.
 */
export async function checkSyncRateLimit(
  client: SupabaseClient,
  userId: string,
  opts: { max: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - opts.windowSeconds * 1000).toISOString();
  const { count, error } = await client
    .from("sync_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  // A limiter that cannot be evaluated must fail closed: refusing a sync is
  // safer than allowing an unbounded number of billable upstream calls.
  if (error) {
    return { allowed: false, retryAfterSeconds: opts.windowSeconds, windowSeconds: opts.windowSeconds };
  }

  if ((count ?? 0) >= opts.max) {
    return { allowed: false, retryAfterSeconds: opts.windowSeconds, windowSeconds: opts.windowSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0, windowSeconds: opts.windowSeconds };
}

/** Reconcile's default sync budget: 10 attempts per minute per user. */
export const SYNC_RATE_LIMIT = { max: 10, windowSeconds: 60 } as const;
