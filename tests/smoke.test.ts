import { describe, expect, it } from "@jest/globals";
import { loadPublicEnv, parseAppEnv, type RawEnv } from "../src/lib/env";

const VALID_SOURCE: RawEnv = {
  EXPO_PUBLIC_APP_ENV: "development",
  EXPO_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: "demo-anon-key",
};

describe("Phase 1 smoke", () => {
  it("defaults the app environment to development", () => {
    expect(parseAppEnv(undefined)).toBe("development");
    expect(parseAppEnv("")).toBe("development");
    expect(loadPublicEnv({ ...VALID_SOURCE, EXPO_PUBLIC_APP_ENV: undefined }).appEnv).toBe(
      "development",
    );
  });

  it("accepts known environments and rejects unknown ones", () => {
    expect(parseAppEnv("staging")).toBe("staging");
    expect(parseAppEnv("production")).toBe("production");
    expect(() => parseAppEnv("prod")).toThrow();
  });

  it("requires client-safe Supabase settings", () => {
    expect(loadPublicEnv(VALID_SOURCE).supabaseUrl).toBe(
      "https://demo.supabase.co",
    );
    expect(() => loadPublicEnv({})).toThrow();
    expect(() =>
      loadPublicEnv({ ...VALID_SOURCE, EXPO_PUBLIC_SUPABASE_URL: "http://insecure.local" }),
    ).toThrow();
    expect(() =>
      loadPublicEnv({ ...VALID_SOURCE, EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined }),
    ).toThrow();
    expect(() =>
      loadPublicEnv({
        ...VALID_SOURCE,
        EXPO_PUBLIC_SUPABASE_URL: "https://demo.supabase.co/rest/v1",
      }),
    ).toThrow();
  });
});
