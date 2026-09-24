// Design tokens — motion durations, easings, reduced-motion (design.md §9).
import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export const durations = {
  press: 120,
  ui: 200,
  chart: 240,
  panel: 280,
} as const;

export type Durations = {
  press: number;
  ui: number;
  chart: number;
  panel: number;
};

export const easings = {
  easeOutStrong: "cubic-bezier(0.23, 1, 0.32, 1)",
  easeInOut: "cubic-bezier(0.77, 0, 0.175, 1)",
} as const;

/** Pure reduction logic: reduced motion zeroes every duration. Unit-tested. */
export function resolveDurations(reduceMotion: boolean): Durations {
  if (reduceMotion) {
    return { press: 0, ui: 0, chart: 0, panel: 0 };
  }
  return { ...durations };
}

function readInitialReduceMotion(): boolean {
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return false;
}

/** Durations honoring the OS reduced-motion setting. */
export function useMotion(): Durations {
  const [reduceMotion, setReduceMotion] = useState(readInitialReduceMotion);
  useEffect(() => {
    let mounted = true;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      const listener = (event: MediaQueryListEvent): void => {
        if (mounted) setReduceMotion(event.matches);
      };
      query.addEventListener("change", listener);
      return () => {
        mounted = false;
        query.removeEventListener("change", listener);
      };
    }
    try {
      const pending = AccessibilityInfo.isReduceMotionEnabled() as unknown;
      if (
        pending &&
        typeof (pending as PromiseLike<boolean>).then === "function"
      ) {
        (pending as Promise<boolean>)
          .then((value) => {
            if (mounted) setReduceMotion(value);
          })
          .catch(() => {});
      }
    } catch {
      // Reduced-motion API unavailable; assume off.
    }
    return () => {
      mounted = false;
    };
  }, []);
  return useMemo(() => resolveDurations(reduceMotion), [reduceMotion]);
}
