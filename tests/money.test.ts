import { describe, expect, it } from "@jest/globals";
import {
  formatMinor,
  isValidMinorAmount,
} from "../supabase/functions/_shared/finance";

describe("currency math (integer minor units)", () => {
  it("validates minor amounts", () => {
    expect(isValidMinorAmount(5000000)).toBe(true);
    expect(isValidMinorAmount(1)).toBe(true);
    expect(isValidMinorAmount(0)).toBe(false);
    expect(isValidMinorAmount(-100)).toBe(false);
    expect(isValidMinorAmount(10.5)).toBe(false);
    expect(isValidMinorAmount("100")).toBe(false);
  });

  it("formats kobo as naira", () => {
    expect(formatMinor(5000000, "NGN")).toBe("₦50,000.00");
    expect(formatMinor(1, "NGN")).toBe("₦0.01");
    expect(formatMinor(45000000, "NGN")).toBe("₦450,000.00");
  });

  it("rejects non-integer formatting", () => {
    expect(() => formatMinor(10.5, "NGN")).toThrow();
  });
});
