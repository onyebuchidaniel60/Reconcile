import { useId, useMemo, useState } from "react";
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Defs, G, Rect } from "react-native-svg";
import { useChartReveal } from "../lib/motion/useChartReveal";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { ChartTextEquivalent } from "./ChartTextEquivalent";
import { HatchPattern, toPatternId } from "./HatchPattern";
import { Starburst } from "./Starburst";
import { Text } from "./Text";

export type BarFill = "ink" | "yellow" | "hatched";

export interface BarDatum {
  label: string;
  value: number;
  fill: BarFill;
}

export interface BarAxisTick {
  value: number;
  label: string;
}

interface BarChartProps {
  bars: BarDatum[];
  axisTicks: BarAxisTick[];
  height?: number;
  calloutText?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * Validates the one-hatched-bar rule. Returns an error message, or null
 * when the fills are valid. Enforced by unit test, not just documentation.
 */
export function validateBarFills(bars: BarDatum[]): string | null {
  const hatched = bars.filter((bar) => bar.fill === "hatched").length;
  if (hatched !== 1) {
    return `BarChart requires exactly one hatched bar, found ${hatched}.`;
  }
  return null;
}

function AnimatedBar({
  offsetX,
  slotWidth,
  chartHeight,
  ratio,
  fill,
  hatchId,
  delayMs,
  label,
}: {
  offsetX: number;
  slotWidth: number;
  chartHeight: number;
  ratio: number;
  fill: BarFill;
  hatchId: string;
  delayMs: number;
  label: string;
}) {
  const { progress } = useChartReveal(delayMs);
  const animatedProps = useAnimatedProps(() => {
    const barHeight = Math.max(ratio * progress.value * chartHeight, 2);
    return {
      y: chartHeight - barHeight,
      height: barHeight,
    };
  });
  const fillValue =
    fill === "ink"
      ? colors.ink
      : fill === "yellow"
        ? colors.signalYellow
        : `url(#${hatchId})`;
  return (
    <G x={offsetX}>
      <AnimatedRect
        testID={`bar-${label}`}
        animatedProps={animatedProps}
        x={2}
        y={chartHeight - 2}
        width={Math.max(slotWidth - 4, 2)}
        height={2}
        rx={radius.chip}
        fill={fillValue}
      />
    </G>
  );
}

/**
 * Bar chart per design.md §7: rounded rect bars (radius 12), solid ink /
 * solid yellow / yellow-with-hatch fills with exactly one hatched bar, a
 * line-color baseline, and an optional alert-red starburst callout above
 * the highlighted bar. Heights animate staggered 40ms per bar.
 */
export function BarChart({
  bars,
  axisTicks,
  height = 160,
  calloutText,
  testID,
  style,
}: BarChartProps) {
  const [measuredWidth, setMeasuredWidth] = useState(300);
  const rawId = useId();
  const hatchId = useMemo(() => toPatternId(rawId), [rawId]);
  const problem = validateBarFills(bars);
  if (problem) {
    console.warn(`[BarChart] ${problem}`);
  }

  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const slotWidth = measuredWidth / Math.max(bars.length, 1);
  const hatchedIndex = bars.findIndex((bar) => bar.fill === "hatched");
  const description =
    `Bar chart. ` +
    bars.map((bar) => `${bar.label} ${bar.value}`).join(". ") +
    ".";
  const gutterTicks = [...axisTicks].sort((a, b) => b.value - a.value);

  const onLayout = (event: LayoutChangeEvent): void => {
    setMeasuredWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={description}
      testID={testID}
      style={style}
    >
      {calloutText && hatchedIndex >= 0 ? (
        <View style={{ alignItems: "center", marginBottom: spacing.xs }}>
          <Starburst variant="alert-red" size={48} text={calloutText} />
        </View>
      ) : null}
      <View style={{ flexDirection: "row" }}>
        {gutterTicks.length > 0 ? (
          <View
            style={{
              justifyContent: "space-between",
              marginRight: spacing.xs,
              height: height - 24,
            }}
          >
            {gutterTicks.map((tick) => (
              <Text key={tick.label} role="small" style={{ opacity: 0.6 }}>
                {tick.label}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1 }} onLayout={onLayout}>
          <Svg
            width={measuredWidth}
            height={height}
            viewBox={`0 0 ${measuredWidth} ${height}`}
          >
            <Defs>
              <HatchPattern id={hatchId} />
            </Defs>
            {bars.map((bar, index) => (
              <AnimatedBar
                key={bar.label}
                offsetX={index * slotWidth}
                slotWidth={slotWidth}
                chartHeight={height - 24}
                ratio={bar.value / max}
                fill={bar.fill}
                hatchId={hatchId}
                delayMs={index * 40}
                label={bar.label}
              />
            ))}
          </Svg>
          <View style={{ height: 1, backgroundColor: colors.line, opacity: 0.4 }} />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: spacing.xs,
            }}
          >
            {bars.map((bar) => (
              <Text key={bar.label} role="small" style={{ opacity: 0.6 }}>
                {bar.label}
              </Text>
            ))}
          </View>
        </View>
      </View>
      <ChartTextEquivalent description={description} />
    </View>
  );
}
