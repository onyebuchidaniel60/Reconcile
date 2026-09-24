import { describe, expect, it } from "@jest/globals";
import { categoryTints, colors } from "../src/theme/colors";
import {
  body,
  display,
  displayXl,
  fontFamilyForWeight,
  h1,
  h2,
  h3,
  mono,
  small,
  titleHeavy,
  titleLight,
  type TypeRole,
} from "../src/theme/type";
import { spacing } from "../src/theme/spacing";
import { radius } from "../src/theme/radius";
import { durations, easings, resolveDurations } from "../src/theme/motion";

describe("design tokens (design.md §3–§5, §9)", () => {
  it("exports the exact palette", () => {
    expect(colors).toEqual({
      ink: "#0A0A0A",
      paper: "#F6F6F1",
      signalYellow: "#EAFF00",
      line: "#DADAD2",
      mist: "#CDE5EC",
      mint: "#D5F2C4",
      coral: "#FFB0A8",
      lavender: "#A49BFF",
      alertRed: "#EF3D28",
      iconButton: "#E8E8E3",
      inkOverlay10: "rgba(10, 10, 10, 0.1)",
      paperOverlay12: "rgba(246, 246, 241, 0.12)",
    });
  });

  it("maps every canonical category tint", () => {
    expect(categoryTints).toEqual({
      Food: colors.coral,
      Transport: colors.lavender,
      Bills: colors.alertRed,
      Shopping: colors.signalYellow,
      Entertainment: colors.mist,
      Health: colors.mint,
      Personal: colors.lavender,
      Education: colors.mist,
      Family: colors.coral,
      Income: colors.mint,
      "Internal Transfer": colors.paper,
    });
  });

  it("exports every typographic role with a valid shape", () => {
    const roles: Record<string, TypeRole> = {
      displayXl,
      display,
      titleLight,
      titleHeavy,
      h1,
      h2,
      h3,
      body,
      small,
      mono,
    };
    for (const role of Object.values(roles)) {
      expect(typeof role.fontSize).toBe("number");
      expect(typeof role.lineHeight).toBe("number");
      expect(role.lineHeight).toBeGreaterThanOrEqual(role.fontSize);
      expect(role.fontWeight).toMatch(/^(300|400|500|600|700|800)$/);
      expect(typeof role.letterSpacing).toBe("number");
    }
    expect(displayXl).toEqual({ fontSize: 64, lineHeight: 64, fontWeight: "800", letterSpacing: 0 });
    expect(display).toEqual({ fontSize: 44, lineHeight: 46, fontWeight: "800", letterSpacing: 0 });
    expect(h1).toEqual({ fontSize: 30, lineHeight: 35, fontWeight: "700", letterSpacing: 0 });
    expect(h2).toEqual({ fontSize: 23, lineHeight: 28, fontWeight: "600", letterSpacing: 0 });
    expect(h3).toEqual({ fontSize: 19, lineHeight: 24, fontWeight: "600", letterSpacing: 0 });
    expect(body).toEqual({ fontSize: 16, lineHeight: 23, fontWeight: "400", letterSpacing: 0 });
    expect(small).toEqual({ fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0 });
    expect(mono).toEqual({ fontSize: 15, lineHeight: 22, fontWeight: "500", letterSpacing: 0 });
  });

  it("pairs title weights (light 300 + heavy 700)", () => {
    expect(titleLight.fontWeight).toBe("300");
    expect(titleHeavy.fontWeight).toBe("700");
    expect(titleLight.fontSize).toBe(titleHeavy.fontSize);
    expect(titleLight.lineHeight).toBe(titleHeavy.lineHeight);
  });

  it("resolves every weight to a loaded Inter family", () => {
    expect(fontFamilyForWeight).toEqual({
      "300": "Inter_300Light",
      "400": "Inter_400Regular",
      "500": "Inter_500Medium",
      "600": "Inter_600SemiBold",
      "700": "Inter_700Bold",
      "800": "Inter_800ExtraBold",
    });
  });

  it("exports the spacing and radius scales", () => {
    expect(spacing).toEqual({ xxs: 6, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 });
    expect(radius).toEqual({ chip: 12, compact: 20, card: 28, pill: 999 });
  });

  it("exports motion durations and easings", () => {
    expect(durations).toEqual({ press: 120, pop: 180, ui: 200, chart: 240, panel: 280 });
    expect(easings.easeOutStrong).toBe("cubic-bezier(0.23, 1, 0.32, 1)");
    expect(easings.easeInOut).toBe("cubic-bezier(0.77, 0, 0.175, 1)");
  });

  it("zeroes durations under reduced motion", () => {
    expect(resolveDurations(true)).toEqual({ press: 0, pop: 0, ui: 0, chart: 0, panel: 0 });
    expect(resolveDurations(false)).toEqual({ ...durations });
  });
});
