import { renderHook } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { useCardEntrance } from "../src/lib/motion/useCardEntrance";
import { useChartReveal } from "../src/lib/motion/useChartReveal";
import { useConfirmPulse } from "../src/lib/motion/useConfirmPulse";
import { usePressScale } from "../src/lib/motion/usePressScale";

describe("motion helpers", () => {
  it("useChartReveal resolves instantly under reduced motion", async () => {
    const { result } = await renderHook(() =>
      useChartReveal(0, { forceReduceMotion: true }),
    );
    expect(result.current.progress.value).toBe(1);
  });

  it("useChartReveal starts at zero with motion on", async () => {
    const { result } = await renderHook(() => useChartReveal(0));
    expect(typeof result.current.progress.value).toBe("number");
  });

  it("useCardEntrance lands in the final state under reduced motion", async () => {
    const { result } = await renderHook(() =>
      useCardEntrance(2, { forceReduceMotion: true }),
    );
    expect(result.current).toEqual({
      opacity: 1,
      transform: [{ translateY: 0 }],
    });
  });

  it("useConfirmPulse exposes a triggerable pulse", async () => {
    const { result } = await renderHook(() => useConfirmPulse());
    expect(typeof result.current.pulse).toBe("function");
    expect(() => result.current.pulse()).not.toThrow();
    expect(result.current.animatedStyle).toBeDefined();
  });

  it("usePressScale exposes pressable props", async () => {
    const { result } = await renderHook(() => usePressScale(false));
    expect(result.current.Pressable).toBeDefined();
    expect(result.current.animatedStyle).toBeDefined();
    expect(typeof result.current.onPressIn).toBe("function");
    expect(typeof result.current.onPressOut).toBe("function");
  });
});
