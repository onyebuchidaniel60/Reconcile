// Client-safe environment handling.
// Only EXPO_PUBLIC_* keys are ever exposed to the bundle.
// IMPORTANT: read each key as a direct `process.env.EXPO_PUBLIC_*` member
// expression. Expo's babel plugin inlines exactly that shape into production
// bundles (whole-object reads like `process.env` are left as-is and arrive
// empty on web). Server-only secrets must NEVER use the EXPO_PUBLIC_ prefix
// and are never read here.

export type AppEnvName = "development" | "staging" | "production";

const APP_ENV_VALUES: readonly AppEnvName[] = [
  "development",
  "staging",
  "production",
];

export type RawEnv = Record<string, string | undefined>;

function readRawEnv(): RawEnv {
  return {
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function parseAppEnv(raw: string | undefined): AppEnvName {
  if (raw === undefined || raw === "") {
    return "development";
  }
  if ((APP_ENV_VALUES as readonly string[]).includes(raw)) {
    return raw as AppEnvName;
  }
  throw new Error(
    `Invalid EXPO_PUBLIC_APP_ENV: ${JSON.stringify(raw)}. ` +
      `Expected one of: ${APP_ENV_VALUES.join(", ")}.`,
  );
}

export interface PublicEnv {
  readonly appEnv: AppEnvName;
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
}

export function loadPublicEnv(source: RawEnv = readRawEnv()): PublicEnv {
  let supabaseUrl = source["EXPO_PUBLIC_SUPABASE_URL"];
  if (!supabaseUrl || !supabaseUrl.startsWith("https://")) {
    throw new Error(
      "Missing or invalid EXPO_PUBLIC_SUPABASE_URL: expected an https:// URL.",
    );
  }
  // supabase-js appends service paths itself; a path suffix (e.g. /rest/v1)
  // breaks every client call. Fail fast instead of misbehaving at runtime.
  if (new URL(supabaseUrl).pathname !== "/") {
    throw new Error(
      "Invalid EXPO_PUBLIC_SUPABASE_URL: use the bare project URL with no path.",
    );
  }
  supabaseUrl = supabaseUrl.replace(/\/+$/, "");
  const supabaseAnonKey = source["EXPO_PUBLIC_SUPABASE_ANON_KEY"];
  if (!supabaseAnonKey) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return {
    appEnv: parseAppEnv(source["EXPO_PUBLIC_APP_ENV"]),
    supabaseUrl,
    supabaseAnonKey,
  };
}

let cached: PublicEnv | null = null;
let failed = false;

export function getEnv(): PublicEnv {
  if (!cached && !failed) {
    try {
      cached = loadPublicEnv();
    } catch {
      failed = true;
    }
  }
  if (!cached) {
    throw new Error(
      "App is not configured: set EXPO_PUBLIC_SUPABASE_URL and " +
        "EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return cached;
}

export function isConfigured(): boolean {
  try {
    getEnv();
    return true;
  } catch {
    return false;
  }
}
