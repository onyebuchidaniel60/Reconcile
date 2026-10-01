import { describe, expect, it } from "@jest/globals";
import { isAllowedRedirect } from "../supabase/functions/_shared/redirect";

// Regression guard for the native connect failure in Phase 11 close-out.
// `Linking.createURL` resolves to the app's custom scheme on native
// (`reconcile://connect-bank?…`) but to an https URL on web. The connect
// endpoint rejected the native form, so tapping "Connect a real bank" on the
// preview APK returned 400 and the client surfaced a generic non-2xx message.

const SCHEME = "reconcile";

describe("isAllowedRedirect", () => {
  it("accepts the native custom scheme the app actually produces", () => {
    expect(isAllowedRedirect("reconcile://connect-bank?status=complete", SCHEME)).toBe(true);
    expect(isAllowedRedirect("reconcile://connect-bank", SCHEME)).toBe(true);
  });

  it("accepts the web build's https redirect", () => {
    expect(
      isAllowedRedirect("https://reconcile-uhhh2.vercel.app/connect-bank?status=complete", SCHEME),
    ).toBe(true);
    expect(isAllowedRedirect("http://localhost:8081/connect-bank", SCHEME)).toBe(true);
  });

  it("is case-insensitive about the configured scheme", () => {
    expect(isAllowedRedirect("Reconcile://connect-bank", "RECONCILE")).toBe(true);
    expect(isAllowedRedirect("reconcile://connect-bank", "  Reconcile  ")).toBe(true);
  });

  it("refuses script-bearing and non-navigable schemes", () => {
    for (const hostile of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "about:blank",
      "blob:https://evil.example/abc",
    ]) {
      expect(isAllowedRedirect(hostile, SCHEME)).toBe(false);
    }
  });

  it("refuses a scheme that is not the configured one", () => {
    expect(isAllowedRedirect("otherapp://connect-bank", SCHEME)).toBe(false);
    expect(isAllowedRedirect("evil://connect-bank", SCHEME)).toBe(false);
    expect(isAllowedRedirect("reconcile://x", "otherapp")).toBe(false);
  });

  it("fails closed when no app scheme is configured", () => {
    // Empty/unset must not widen acceptance to any custom scheme.
    expect(isAllowedRedirect("reconcile://connect-bank", "")).toBe(false);
    expect(isAllowedRedirect("reconcile://connect-bank", "   ")).toBe(false);
    // https still works without the secret, so web is never broken by a missing
    // APP_SCHEME.
    expect(isAllowedRedirect("https://example.com/x", "")).toBe(true);
  });

  it("refuses unparseable and empty values", () => {
    for (const bad of ["", "   ", "not a url", "//connect-bank", "connect-bank"]) {
      expect(isAllowedRedirect(bad, SCHEME)).toBe(false);
    }
  });

  it("does not accept a scheme-lookalike prefix", () => {
    expect(isAllowedRedirect("reconcile.evil://x", SCHEME)).toBe(false);
    expect(isAllowedRedirect("xreconcile://x", SCHEME)).toBe(false);
  });
});
