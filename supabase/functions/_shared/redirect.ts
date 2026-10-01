// Redirect-target validation for provider connect flows — PURE.
//
// The value is echoed to the provider, so script-bearing and non-navigable
// schemes must be refused. Kept separate from the Edge Function so it can be
// unit-tested without a Deno runtime.

/**
 * Is this a safe redirect target?
 *
 * Two families are legitimate:
 *   - `http:`/`https:` — the web build, and any hosted fallback.
 *   - the app's own custom scheme — the native build. `Linking.createURL`
 *     resolves to e.g. `reconcile://connect-bank?…` on Android, and that is the
 *     correct place for a native deep link.
 *
 * `appScheme` must be the app's configured scheme (app.json `scheme`). It is
 * matched explicitly rather than accepted blindly, so an arbitrary scheme
 * cannot be smuggled in. Pass an empty string to leave the custom-scheme branch
 * closed (fail-closed).
 *
 * Refused: `javascript:`, `data:`, `file:`, `about:`, `blob:`, anything
 * unparseable, and any scheme that is not the configured one.
 */
export function isAllowedRedirect(value: string, appScheme: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol === "https:" || protocol === "http:") return true;

  const expected = appScheme.trim().toLowerCase();
  if (!expected) return false;
  return protocol === `${expected}:`;
}
