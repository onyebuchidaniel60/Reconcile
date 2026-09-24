import { useId, useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedProps,
} from "react-native-reanimated";
import Svg, { Defs, Path } from "react-native-svg";
import { useChartReveal } from "../lib/motion/useChartReveal";
import { colors } from "../theme/colors";
import { formatMinor } from "../../supabase/functions/_shared/finance";
import { ChartLegend } from "./ChartLegend";
import { ChartTextEquivalent } from "./ChartTextEquivalent";
import { HatchPattern, toPatternId } from "./HatchPattern";
import { Text } from "./Text";

const SIZE = 220;
const CENTER = 110;
const RADIUS = 80;
const STROKE = 22;

function polar(angleDeg: number): [number, number] {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + RADIUS * Math.cos(radians), CENTER + RADIUS * Math.sin(radians)];
}

/** SVG arc path for a fractional sweep starting at a fractional offset. */
export function describeDonutArc(fraction: number, startFraction = 0): string {
  const clamped = Math.min(0.9999, Math.max(0.0001, fraction));
  const start = startFraction * 360;
  const sweep = clamped * 360;
  const [startX, startY] = polar(start);
  const [endX, endY] = polar(start + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${startX} ${startY} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${endX} ${endY}`;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface DonutProps {
  total: number;
  primary: number;
  currency: string;
  labels: { primary: string; secondary: string };
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Two-arc donut per design.md §7: solid ink base with a hatched primary arc.
 * Center shows a small "Total" label above the display amount; legend below.
 * Animates the arc sweep on mount unless reduced motion. No text inside SVG.
 */
export function Donut({ total, primary, currency, labels, testID, style }: DonutProps) {
  const clampedPrimary = Math.min(1, Math.max(0, primary));
  const { progress } = useChartReveal();
  const rawId = useId();
  const hatchId = useMemo(() => toPatternId(rawId), [rawId]);
  const primaryProps = useAnimatedProps(() => ({
    d: describeDonutArc(clampedPrimary * progress.value, 0),
  }));
  const secondaryProps = useAnimatedProps(() => ({
    d: describeDonutArc((1 - clampedPrimary) * progress.value, clampedPrimary),
  }));

  const totalLabel = formatMinor(total, currency);
  const description =    `Donut chart. Total ${totalLabel}. ` +
    `${labels.primary} ${(clampedPrimary * 100).toFixed(0)} percent. ` +
    `${labels.secondary} ${((1 - clampedPrimary) * 100).toFixed(0)} percent.`;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={description}
      testID={testID}
      style={style}
    >
      <View style={{ alignItems: "center" }}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 220 220">
          <Defs>
            <HatchPattern id={hatchId} />
          </Defs>
          <AnimatedPath
            d={describeDonutArc(0.0001, clampedPrimary)}
            animatedProps={secondaryProps}
            fill="none"
            stroke={colors.ink}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          <AnimatedPath
            d={describeDonutArc(0.0001, 0)}
            animatedProps={primaryProps}
            fill="none"
            stroke={`url(#${hatchId})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        </Svg>
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text role="small" color="ink">
            Total
          </Text>
          <Text role="h2">{totalLabel}</Text>
        </View>
      </View>
      <ChartLegend
        entries={[
          {
            color: colors.signalYellow,
            label: labels.primary,
            value: formatMinor(Math.round(total * clampedPrimary), currency),
          },
          {
            color: colors.ink,
            label: labels.secondary,
            value: formatMinor(Math.round(total * (1 - clampedPrimary)), currency),
          },
        ]}
      />
      <ChartTextEquivalent description={description} />
    </View>
  );
}
