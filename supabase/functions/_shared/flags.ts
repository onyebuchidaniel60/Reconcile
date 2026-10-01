// Feature flags.
//
// Two transports, one meaning:
//
//   EXPO_PUBLIC_FEATURE_MONO — client bundle. Read by src/lib/flags.ts.
//   FEATURE_MONO              — Edge Function secret. Read here.
//
// They are set independently on purpose. The flag defaults to OFF in both
// places, so a Mono path cannot become reachable by flipping only one side.
//
// Default is OFF for the whole of Phase 11. The operator flips it after
// verifying the sandbox loop.

export const MONO_FLAG = "mono";

function readFlag(value: string | undefined | null): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on";
}

/**
 * Server-side gate. Returns false unless FEATURE_MONO is explicitly set to a
 * truthy string, so a missing secret is always "off" rather than an error.
 */
export function isMonoEnabled(): boolean {
  return readFlag(Deno.env.get("FEATURE_MONO"));
}
