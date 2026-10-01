// Mono Connect widget integration — pure, testable parts.
//
// The WebView is a component (app/connect-bank.tsx). Everything decidable
// without a DOM or a native module lives here so it can be unit-tested under
// jest, which cannot render a WebView.
//
// Two completion channels are supported because Mono documents two flows:
//
//   1. Exchange Token (SDK flow) — the widget hands back an authorization
//      `code`, which the server swaps at `POST /v2/accounts/auth`. Mono
//      documents the code; how the hosted Connect Link page delivers it to a
//      native host is NOT documented, so this channel is best-effort.
//   2. Connect Link (webhook flow) — Mono's own guidance is that after taking
//      the `mono_url` you "wait for mono.events.account_connected and
//      mono.events.account_updated webhooks". The `account_connected` webhook
//      echoes back the `meta.ref` we sent, which claims the reserved `pending`
//      connection row. This is the authoritative channel and the one the app
//      waits on.
//
// Neither channel can compromise security on its own: any code is exchanged
// server-side, and a guessed reference would still need the webhook secret.

import * as Linking from "expo-linking";

/** Origins the Connect WebView is permitted to load. */
export const MONO_WIDGET_ORIGINS = [
  "https://link.mono.co",
  "https://*.mono.co",
] as const;

/** What the widget told us. */
export type WidgetEvent =
  | { type: "success"; code: string }
  | { type: "closed" }
  | { type: "error"; message: string }
  | { type: "ignored" };

/**
 * Interpret a `window.ReactNativeWebView.postMessage` payload.
 *
 * Mono's Connect widget event names (from the Connect SDK's documented event
 * list) are SUCCESS/ACCOUNT_LINKED for a completed link, EXIT for a close, and
 * ERROR for a failure. The payload shape is not pinned down in Mono's docs, so
 * every field is probed defensively and an unrecognised payload is reported as
 * `ignored` rather than guessed at.
 */
export function parseWidgetMessage(raw: string): WidgetEvent {
  if (typeof raw !== "string" || raw.length === 0) return { type: "ignored" };

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Some hosts receive a bare string rather than JSON.
    return classifyFlat(raw);
  }

  if (typeof payload === "string") return classifyFlat(payload);
  if (payload === null || typeof payload !== "object") return { type: "ignored" };

  const rec = payload as Record<string, unknown>;
  const name =
    firstString(rec.event, rec.eventName, rec.type, rec.name, rec.status) ?? "";
  const code = firstString(rec.code, rec.authCode, rec.auth_code, rec.token);

  const upper = name.toUpperCase();

  if (upper.includes("ERROR") || upper.includes("FAIL")) {
    const message =
      firstString(rec.errorMessage, rec.error_message, rec.message) ??
      "The bank connection could not be completed.";
    return { type: "error", message };
  }

  // A code is the strongest signal available, so it is checked before the event
  // name: a payload can carry both, and the code is the part the server needs.
  if (code && code.length > 0) return { type: "success", code };

  if (upper.includes("EXIT") || upper.includes("CLOSE") || upper.includes("CANCEL")) {
    return { type: "closed" };
  }
  if (upper.includes("SUCCESS") || upper.includes("LINKED") || upper.includes("CONNECTED")) {
    return { type: "closed" };
  }

  return { type: "ignored" };
}

function classifyFlat(raw: string): WidgetEvent {
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  if (upper === "EXIT" || upper === "CLOSE" || upper === "CANCEL") {
    return { type: "closed" };
  }
  if (upper.startsWith("ERROR")) {
    // Strip the "ERROR" prefix so the user sees the reason, not the protocol.
    const message = trimmed.slice("ERROR".length).replace(/^[:\s]+/, "");
    return { type: "error", message: message.length > 0 ? message : trimmed };
  }
  if (upper.startsWith("SUCCESS:")) {
    const code = trimmed.slice("SUCCESS:".length).trim();
    return code.length > 0 ? { type: "success", code } : { type: "closed" };
  }
  return { type: "ignored" };
}

function firstString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/**
 * The redirect URL we hand to Mono, which it navigates back to once the user
 * finishes. It is a real app route so the WebView has somewhere valid to land
 * even when no code is present in the query string.
 */
export function buildRedirectUrl(): string {
  const scheme = Linking.createURL("connect-bank");
  return `${scheme}?status=complete`;
}

/**
 * Does a navigation target look like our own redirect landing?
 *
 * Used to detect completion when the widget does not post a message. Matching
 * is on the route, not the origin, because the redirect resolves to the app's
 * custom scheme on native and to a same-origin path on web.
 */
export function isRedirectTarget(url: string): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  return url.includes("connect-bank");
}
