import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Rect } from "react-native-svg";
import { colors } from "../theme/colors";
import { useMotion } from "../theme/motion";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { HatchPattern, toPatternId } from "./HatchPattern";
import { PillBadge } from "./PillBadge";

export type ProgressBarVariant = "light" | "ink" | "over-budget";

/** `large` is the tall Home Budget Overview bar (design.md §8 Home). */
export type ProgressBarSize = "default" | "large";

/**
 * Below this fill ratio the percentage pill can no longer be centred inside
 * the filled portion without spilling out of it, so it is right-anchored to
 * the fill's edge instead. A ratio, not a pixel value — the bar is fluid.
 */
const PILL_EDGE_ANCHOR_RATIO = 0.15;

/** Tall bar height for `size="large"`. */
const LARGE_HEIGHT = 28;

const SIZES: Record<ProgressBarSize, number> = {
  default: 12,
  large: LARGE_HEIGHT,
};

interface ProgressBarProps {
  value: number;
  label?: string;
  variant?: ProgressBarVariant;
  height?: number;
  size?: ProgressBarSize;
  /** Hatches the unfilled remainder (design.md §8 Home budget overview). */
  hatched?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Progress bar per design.md §7. Track is `line` at 60% opacity with pill
 * ends; fill is `ink` on light cards and `signal-yellow` on ink cards, or
 * `alert-red` for the over-budget variant (fill capped full, label uncapped).
 * A label renders inside a small white pill over the filled portion.
 * Width animates over the UI duration unless reduced motion is on.
 *
 * `size="large"` is the Home Budget Overview treatment from design.md §8: a
 * taller bar on a `paper`-at-60% track with the unfilled remainder carrying
 * the diagonal hatch, so "spent" and "left" are readable without parsing the
 * number. The percentage pill is layered outside the clipped track so a
 * narrow fill can never hide it.
 */
export function ProgressBar({
  value,
  label,
  variant = "light",
  height,
  size = "default",
  hatched = false,
  testID,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));
  const motion = useMotion();
  const progress = useSharedValue(clamped);
  const barHeight = height ?? SIZES[size];
  const large = size === "large";

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: motion.ui });
  }, [clamped, motion, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const fillColor =
    variant === "over-budget"
      ? colors.alertRed
      : variant === "light"
        ? colors.ink
        : colors.signalYellow;

  // Pinned per testID so two bars on one screen never share a pattern id.
  const patternId = toPatternId(`${testID ?? "bar"}-remainder`);
  const fillPercent = clamped * 100;
  const edgeAnchored = clamped < PILL_EDGE_ANCHOR_RATIO;
  const zonePercent = Math.max(fillPercent, PILL_EDGE_ANCHOR_RATIO * 100);

  return (
    <View testID={testID ? `${testID}-wrap` : undefined} style={{ position: "relative" }}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={label ? `Progress ${label}` : "Progress"}
        accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
        testID={testID}
        style={[
          {
            height: barHeight,
            borderRadius: radius.pill,
            overflow: "hidden",
            justifyContent: "center",
          },
          style,
        ]}
      >
        {/* Track: `paper` on the tall Home bar, `line` elsewhere, both 60%. */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            right: 0,
            borderRadius: radius.pill,
            backgroundColor: large ? colors.paper : colors.line,
            opacity: 0.6,
          }}
          testID={testID ? `${testID}-track` : undefined}
        />
        {hatched ? (
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: 0, top: 0, bottom: 0, right: 0 }}
            testID={testID ? `${testID}-hatch` : undefined}
          >
            <Svg width="100%" height="100%">
              <Defs>
                <HatchPattern id={patternId} color={colors.line} />
              </Defs>
              <Rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill={`url(#${patternId})`}
                opacity={0.4}
              />
            </Svg>
          </View>
        ) : null}
        <Animated.View
          style={[
            {
              height: "100%",
              borderRadius: radius.pill,
              backgroundColor: fillColor,
            },
            fillStyle,
          ]}
          testID={testID ? `${testID}-fill` : undefined}
        />
      </View>
      {label ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${zonePercent}%`,
            alignItems: edgeAnchored ? "flex-end" : "center",
            justifyContent: "center",
          }}
          testID={testID ? `${testID}-label-zone` : undefined}
        >
          <PillBadge
            variant="light"
            label={label}
            weight="700"
            testID={testID ? `${testID}-label` : undefined}
            style={{
              alignSelf: "auto",
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
