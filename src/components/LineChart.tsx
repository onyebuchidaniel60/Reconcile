import { useState } from "react";
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Circle, Polyline } from "react-native-svg";
import { useChartReveal } from "../lib/motion/useChartReveal";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { ChartTextEquivalent } from "./ChartTextEquivalent";
import { Starburst } from "./Starburst";
import { Text } from "./Text";

export interface LinePoint {
  x: number;
  y: number;
}

interface LineChartProps {
  points: LinePoint[];
  projectedFrom?: number;
  axisTicks?: { value: number; label: string }[];
  width?: number;
  height?: number;
  cornerStarburst?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

const PAD = 8;

function scalePoints(
  points: LinePoint[],
  width: number,
  height: number,
): { px: number; py: number }[] {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  return points.map((p) => ({
    px: PAD + ((p.x - minX) / spanX) * (width - PAD * 2),
    py: height - PAD - ((p.y - minY) / spanY) * (height - PAD * 2),
  }));
}

function toPointsAttr(scaled: { px: number; py: number }[]): string {
  return scaled.map((p) => `${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(" ");
}

/**
 * Line chart per design.md §7: signal-yellow 3px polyline with 8px filled
 * circle markers, dashed projected trailing segment, no area fill, optional
 * paper corner starburst. The line draws by interpolating points 0 → target.
 */
export function LineChart({
  points,
  projectedFrom,
  axisTicks = [],
  width = 300,
  height = 160,
  cornerStarburst = false,
  testID,
  style,
}: LineChartProps) {
  const [measuredWidth, setMeasuredWidth] = useState(width);
  const { progress } = useChartReveal();
  const scaled = scalePoints(points, measuredWidth, height);
  const split =
    projectedFrom === undefined
      ? scaled.length
      : Math.min(Math.max(projectedFrom, 1), scaled.length);
  const main = scaled.slice(0, split);
  const projected = scaled.slice(Math.max(split - 1, 0));

  const animatedProps = useAnimatedProps(() => {
    const first = main[0];
    const drawn = main.map((p) => ({
      px: first ? first.px + (p.px - first.px) * progress.value : p.px,
      py: p.py,
    }));
    return { points: toPointsAttr(drawn) };
  });

  const description =
    `Line chart. ` +
    points.map((p) => `${p.x}: ${p.y}`).join(". ") +
    (projectedFrom !== undefined ? ". Includes a projected segment." : ".");

  const onLayout = (event: LayoutChangeEvent): void => {
    setMeasuredWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={description}
      testID={testID}
      style={style}
      onLayout={onLayout}
    >
      <View>
        <Svg width={measuredWidth} height={height} viewBox={`0 0 ${measuredWidth} ${height}`}>
          <AnimatedPolyline
            testID={testID ? `${testID}-line` : undefined}
            animatedProps={animatedProps}
            points={toPointsAttr(main)}
            fill="none"
            stroke={colors.signalYellow}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {projected.length > 1 ? (
            <Polyline
              points={toPointsAttr(projected)}
              fill="none"
              stroke={colors.signalYellow}
              strokeWidth={3}
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
          ) : null}
          {main.map((p, index) => (
            <Circle key={index} cx={p.px} cy={p.py} r={4} fill={colors.signalYellow} />
          ))}
        </Svg>
        {cornerStarburst ? (
          <View style={{ position: "absolute", top: 0, right: 0 }}>
            <Starburst variant="paper" size={32} />
          </View>
        ) : null}
      </View>
      {axisTicks.length > 0 ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: spacing.xs,
          }}
        >
          {axisTicks.map((tick) => (
            <Text key={tick.label} role="small" style={{ opacity: 0.6 }}>
              {tick.label}
            </Text>
          ))}
        </View>
      ) : null}
      <ChartTextEquivalent description={description} />
    </View>
  );
}
