import { describe, expect, it } from "@jest/globals";
import {
  parseWidgetMessage,
  isRedirectTarget,
} from "../src/lib/monoWidget";
import { getProvider, hasRealProvider, providersForCountry } from "../src/providers/registry";

describe("mono widget message parsing", () => {
  it("parses a success event carrying a code", () => {
    const parsed = parseWidgetMessage(
      JSON.stringify({ event: "SUCCESS", code: "code_abc123" }),
    );
    expect(parsed).toEqual({ type: "success", code: "code_abc123" });
  });

  it("parses a success event with the camelCase authCode field", () => {
    const parsed = parseWidgetMessage(
      JSON.stringify({ type: "ACCOUNT_LINKED", authCode: "code_xyz" }),
    );
    expect(parsed).toEqual({ type: "success", code: "code_xyz" });
  });

  it("parses a close event", () => {
    expect(parseWidgetMessage(JSON.stringify({ event: "EXIT", pageName: "MFA" }))).toEqual({
      type: "closed",
    });
    expect(parseWidgetMessage(JSON.stringify({ type: "CLOSE" }))).toEqual({ type: "closed" });
    expect(parseWidgetMessage(JSON.stringify({ event: "CANCEL" }))).toEqual({ type: "closed" });
  });

  it("parses an error event and keeps the message", () => {
    const parsed = parseWidgetMessage(
      JSON.stringify({ event: "ERROR", errorMessage: "Bank rejected the login." }),
    );
    expect(parsed).toEqual({ type: "error", message: "Bank rejected the login." });
  });

  it("falls back to a generic message on an error with no text", () => {
    const parsed = parseWidgetMessage(JSON.stringify({ event: "ERROR" }));
    expect(parsed.type).toBe("error");
    if (parsed.type === "error") {
      expect(parsed.message.length).toBeGreaterThan(0);
    }
  });

  it("handles a bare non-JSON string payload", () => {
    expect(parseWidgetMessage("EXIT")).toEqual({ type: "closed" });
    expect(parseWidgetMessage("SUCCESS:code_123")).toEqual({ type: "success", code: "code_123" });
    expect(parseWidgetMessage("ERROR:bank down")).toEqual({
      type: "error",
      message: "bank down",
    });
  });

  it("treats an unrecognised payload as ignored rather than guessing", () => {
    expect(parseWidgetMessage(JSON.stringify({ event: "INSTITUTION_SELECTED" }))).toEqual({
      type: "ignored",
    });
    expect(parseWidgetMessage("")).toEqual({ type: "ignored" });
    expect(parseWidgetMessage("nonsense")).toEqual({ type: "ignored" });
    expect(parseWidgetMessage("null")).toEqual({ type: "ignored" });
  });

  it("treats SUCCESS with no code as closed, never as a success with an empty code", () => {
    // The server would reject an empty code; reporting `closed` is honest.
    expect(parseWidgetMessage(JSON.stringify({ event: "SUCCESS" }))).toEqual({ type: "closed" });
  });

  it("prefers an explicit code over a close event name", () => {
    expect(parseWidgetMessage(JSON.stringify({ event: "EXIT", code: "code_1" }))).toEqual({
      type: "success",
      code: "code_1",
    });
  });
});

describe("mono redirect detection", () => {
  it("recognises the app redirect target on a custom scheme", () => {
    expect(isRedirectTarget("reconcile://connect-bank?status=complete")).toBe(true);
  });

  it("recognises the same route on web", () => {
    expect(isRedirectTarget("https://reconcile.example.com/connect-bank?status=complete")).toBe(
      true,
    );
  });

  it("does not match an unrelated widget page", () => {
    expect(isRedirectTarget("https://link.mono.co/ALGSTO222222WE")).toBe(false);
    expect(isRedirectTarget("")).toBe(false);
  });
});

describe("client provider registry", () => {
  it("offers Mono in Nigeria ahead of demo", () => {
    const providers = providersForCountry("NG");
    expect(providers.map((p) => p.id)).toEqual(["mono", "demo"]);
  });

  it("is case-insensitive on the country code", () => {
    expect(providersForCountry("ng").map((p) => p.id)).toEqual(["mono", "demo"]);
  });

  it("offers only demo where no real provider exists", () => {
    expect(providersForCountry("KE").map((p) => p.id)).toEqual(["demo"]);
    expect(providersForCountry("XX").map((p) => p.id)).toEqual(["demo"]);
    expect(hasRealProvider("KE")).toBe(false);
    expect(hasRealProvider("NG")).toBe(true);
  });

  it("reports Mono's capabilities without claiming anything it cannot do", () => {
    const mono = getProvider("mono");
    expect(mono).not.toBeNull();
    expect(mono!.capabilities).toEqual({
      realtime: true,
      pagination: true,
      reauth: true,
      multipleAccounts: true,
      disconnect: true,
    });
    // The client must know the real provider needs a server-side session.
    expect(mono!.requiresConnectSession).toBe(true);
  });

  it("does not claim realtime for the local demo fixture", () => {
    const demo = getProvider("demo");
    expect(demo!.capabilities.realtime).toBe(false);
    expect(demo!.capabilities.pagination).toBe(false);
    expect(demo!.requiresConnectSession).toBe(false);
  });

  it("returns null for an unknown provider id", () => {
    expect(getProvider("plaid")).toBeNull();
    expect(getProvider("")).toBeNull();
  });
});
