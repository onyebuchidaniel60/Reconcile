import { View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { Text } from "./Text";

export interface AxisTick {
  value: number;
  label: string;
}

interface ChartAxisProps {
  orientation: "x" | "y";
  ticks: AxisTick[];
  length: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Labeled axis built from Views (never SVG text, so labels respect
 * accessibility and dynamic type). Axis line is `line` at 40% opacity;
 * tick labels are `small` ink at 60%.
 */
export function ChartAxis({ orientation, ticks, length, testID, style }: ChartAxisProps) {
  if (orientation === "x") {
    return (
      <View testID={testID} style={[{ width: length }, style]}>
        <View style={{ height: 1, backgroundColor: colors.line, opacity: 0.4 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs }}>
          {ticks.map((tick) => (
            <Text key={tick.label} role="small" style={{ opacity: 0.6 }}>
              {tick.label}
            </Text>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View testID={testID} style={[{ height: length, flexDirection: "row" }, style]}>
      <View style={{ justifyContent: "space-between", marginRight: spacing.xs }}>
        {ticks.map((tick) => (
          <Text key={tick.label} role="small" style={{ opacity: 0.6 }}>
            {tick.label}
          </Text>
        ))}
      </View>
      <View style={{ width: 1, backgroundColor: colors.line, opacity: 0.4 }} />
    </View>
  );
}
