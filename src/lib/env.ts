// Client-safe environment handling pattern.
//
// Only EXPO_PUBLIC_* keys are ever exposed to the mobile bundle (Expo injects
// them into `process.env`). Server-only secrets (Supabase service-role key,
// Mono keys, OpenAI key, RevenueCat webhook secret) must NEVER use the
// EXPO_PUBLIC_ prefix and must never be read here. They arrive in later phases
// as Supabase Edge Function secrets only.
//
// Reads via `globalThis` so this module stays dependency-free and safe to
// import from tests, components and routes.

export type AppEnvName = "development" | "staging" | "production";

const APP_ENV_VALUES: readonly AppEnvName[] = [
  "development",
  "staging",
  "production",
];

type RawEnv = Record<string, string | undefined>;

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
  /** Optional until the Supabase Auth phase; must be https when set. */
  readonly supabaseUrl: string | undefined;
  /** Optional until the Supabase Auth phase (anon key only, never secrets). */
  readonly supabaseAnonKey: string | undefined;
}

export function loadPublicEnv(source: RawEnv = readRawEnv()): PublicEnv {
  const supabaseUrl = source["EXPO_PUBLIC_SUPABASE_URL"];
  if (supabaseUrl !== undefined && !supabaseUrl.startsWith("https://")) {
    throw new Error(
      "Invalid EXPO_PUBLIC_SUPABASE_URL: expected an https:// URL.",
    );
  }
  return {
    appEnv: parseAppEnv(source["EXPO_PUBLIC_APP_ENV"]),
    supabaseUrl,
    supabaseAnonKey: source["EXPO_PUBLIC_SUPABASE_ANON_KEY"],
  };
}

/** Validated, client-safe environment snapshot for the running app. */
export const env: PublicEnv = loadPublicEnv();
