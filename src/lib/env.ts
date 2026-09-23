// Client-safe environment handling.
// Only EXPO_PUBLIC_* keys are ever exposed to the bundle (Expo injects them
// into `process.env`). Server-only secrets must NEVER use the EXPO_PUBLIC_
// prefix and are never read here.
// Reads via `globalThis` so this module stays dependency-free. Access is lazy
// (`getEnv`) so misconfiguration renders a setup message instead of crashing.

export type AppEnvName = "development" | "staging" | "production";

const APP_ENV_VALUES: readonly AppEnvName[] = [
  "development",
  "staging",
  "production",
];

export type RawEnv = Record<string, string | undefined>;

function readRawEnv(): RawEnv {
  const holder = globalThis as {
    process?: { env?: RawEnv };
  };
  return holder.process?.env ?? {};
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
