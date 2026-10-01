/**
 * End-to-end verification of the deployed Mono webhook (Phase 11 close-out).
 *
 * WHY THIS IS A SCRIPT AND NOT A TEST: Supabase now masks secret values in both
 * `supabase secrets list` and the Management API, so an agent cannot read
 * MONO_WEBHOOK_SECRET to authenticate a synthetic event. The operator runs this
 * locally with the secret in their own shell; the value never reaches me, a log,
 * or a commit.
 *
 * What it proves, in order:
 *   1. The feature gate is ON (a wrong secret is rejected 401, not 404).
 *   2. A correctly authenticated event is ACCEPTED and written to
 *      provider_events exactly once.
 *   3. The SAME event redelivered is REJECTED as a duplicate (200 duplicate,
 *      no second row) — this is the idempotency guarantee.
 *   4. A third event with a NEW id is accepted, so the gate is not simply
 *      rejecting everything.
 *
 * Usage (PowerShell):
 *   $env:MONO_WEBHOOK_SECRET = '<the value from your Mono dashboard>'
 *   $env:SUPABASE_URL        = '<project url>'
 *   $env:SUPABASE_SERVICE_ROLE_KEY = '<service role key>'
 *   node scripts/mono-webhook-verify.cjs
 *
 * Optional: MONO_WEBHOOK_URL to override the deployed endpoint.
 *
 * The script prints event ids and row counts, never the secret.
 */
const crypto = require("crypto");

const WEBHOOK_URL =
  process.env.MONO_WEBHOOK_URL ||
  "https://ztfqckfdvchcqksluqri.supabase.co/functions/v1/mono-webhook";
const SECRET = process.env.MONO_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}
function die(message) {
  console.error(`mono-webhook-verify: ${message}`);
  process.exit(2);
}
function base() {
  return String(SUPABASE_URL).replace(/\/+$/, "");
}

async function postEvent(body, secretHeader) {
  const headers = { "Content-Type": "application/json" };
  if (secretHeader !== null) headers["mono-webhook-secret"] = secretHeader;
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  return { status: response.status, body: parsed };
}

async function countRows(eventId) {
  const url =
    `${base()}/rest/v1/provider_events` +
    `?select=id&provider_id=eq.mono&provider_event_id=eq.${encodeURIComponent(eventId)}`;
  const response = await fetch(url, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows.length : null;
}

async function deleteRows(eventId) {
  const url =
    `${base()}/rest/v1/provider_events` +
    `?provider_id=eq.mono&provider_event_id=eq.${encodeURIComponent(eventId)}`;
  await fetch(url, {
    method: "DELETE",
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
}

/** A payload shaped like Mono's documented account_connected event. */
function makeEvent(eventId, reference) {
  return {
    event: "mono.events.account_connected",
    event_id: eventId,
    timestamp: new Date().toISOString(),
    data: {
      id: `verifyacct${crypto.randomBytes(4).toString("hex")}`,
      customer: `verifycust${crypto.randomBytes(4).toString("hex")}`,
      meta: {
        data_status: "PROCESSING",
        auth_method: "internet_banking",
        ref: reference,
      },
      app: "verify-app",
    },
  };
}

(async () => {
  if (!SECRET) die("MONO_WEBHOOK_SECRET is required.");
  if (!SUPABASE_URL) die("SUPABASE_URL is required (to count provider_events rows).");
  if (!SERVICE_ROLE_KEY) die("SUPABASE_SERVICE_ROLE_KEY is required.");

  const suffix = crypto.randomBytes(5).toString("hex");
  const eventId = `p11-verify-${suffix}`;
  const event2Id = `p11-verify2-${suffix}`;
  const reference = `p11-verify-ref-${suffix}`;

  console.log(`webhook: ${WEBHOOK_URL}`);
  console.log(`event id: ${eventId}\n`);

  // 1. Gate on, and a bad secret rejected.
  const bad = await postEvent(makeEvent(`${eventId}-bad`, reference), "wrong-secret");
  check(
    "feature gate ON and bad secret rejected",
    bad.status === 401,
    `status ${bad.status} code ${bad.body?.error?.code ?? "n/a"} (404 would mean FEATURE_MONO is unset)`,
  );

  // 2. Correctly authenticated event accepted, written once.
  const first = await postEvent(makeEvent(eventId, reference), SECRET);
  const rowsAfterFirst = await countRows(eventId);
  check(
    "signed event accepted",
    first.status === 200 && first.body?.duplicate !== true,
    `status ${first.status} handled ${first.body?.handled ?? "n/a"}`,
  );
  check(
    "provider_events written exactly once",
    rowsAfterFirst === 1,
    `${rowsAfterFirst} row(s) for ${eventId}`,
  );

  // 3. Redelivery of the same event is a no-op.
  const dup = await postEvent(makeEvent(eventId, reference), SECRET);
  const rowsAfterDup = await countRows(eventId);
  check(
    "duplicate rejected idempotently (200, duplicate:true)",
    dup.status === 200 && dup.body?.duplicate === true,
    `status ${dup.status} duplicate ${dup.body?.duplicate}`,
  );
  check("still exactly one row after redelivery", rowsAfterDup === 1, `${rowsAfterDup} row(s)`);

  // 4. A different event id is still accepted.
  const second = await postEvent(makeEvent(event2Id, reference), SECRET);
  const rowsSecond = await countRows(event2Id);
  check(
    "a new event id is accepted",
    second.status === 200 && rowsSecond === 1,
    `status ${second.status}, ${rowsSecond} row(s)`,
  );

  // Clean up so re-runs stay clean.
  await deleteRows(eventId);
  await deleteRows(event2Id);
  console.log("\n(verification rows deleted)");

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((error) => die(error && error.message ? error.message : String(error)));
