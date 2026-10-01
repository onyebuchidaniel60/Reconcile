/**
 * Creates a pre-confirmed Supabase user for agent-as-user web passes.
 *
 * Why this exists: Supabase rejects example.com addresses and rate-limits
 * signup emails, so agent-as-user passes cannot use the normal signup flow.
 * This script uses the admin API to create a confirmed user directly.
 *
 * Usage:
 *   PASS_EMAIL=test@yourdomain.com PASS_PASSWORD=... node scripts/create-test-user.cjs
 *
 * Credentials come from the environment and are never committed. The script
 * requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 *
 * Do not commit the credentials. Do not run this against a production
 * project with real user data.
 */
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.PASS_EMAIL;
const PASSWORD = process.env.PASS_PASSWORD;

function fail(message) {
  console.error(`create-test-user: ${message}`);
  process.exit(1);
}

if (!SUPABASE_URL) fail("SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) is required.");
if (!SERVICE_ROLE_KEY) fail("SUPABASE_SERVICE_ROLE_KEY is required.");
if (!EMAIL) fail("PASS_EMAIL is required.");
if (!PASSWORD) fail("PASS_PASSWORD is required.");
if (PASSWORD.length < 6) fail("PASS_PASSWORD must be at least 6 characters.");

// Refuse to run against a URL that does not look like the project this repo
// targets. The admin API can create users on any project; a typo here would
// pollute an unrelated one.
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(SUPABASE_URL)) {
  fail(`Refusing to run against an unexpected project URL: ${SUPABASE_URL}`);
}

(async () => {
  const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    }),
  });

  const text = await response.text();

  // 422/400 with "already registered" is fine for a re-run: the point is that
  // the user exists and can sign in.
  if (!response.ok && !/already|registered|exists/i.test(text)) {
    console.error(`create-test-user: ${response.status} ${text}`);
    process.exit(1);
  }

  let id = "";
  try {
    id = JSON.parse(text).id ?? "";
  } catch {
    /* non-JSON body on an "already registered" response; the user exists. */
  }

  console.log(`create-test-user: ok (${response.status})${id ? ` id=${id}` : ""}`);
  console.log(`PASS_EMAIL=${EMAIL}`);
})().catch((error) => fail(error && error.message ? error.message : String(error)));
