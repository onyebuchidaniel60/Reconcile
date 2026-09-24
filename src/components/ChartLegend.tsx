import { View, type StyleProp, type ViewStyle } from "react-native";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { Text } from "./Text";

export interface LegendEntry {
  color: string;
  label: string;
  value: string;
}

interface ChartLegendProps {
  entries: LegendEntry[];
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Two-column legend (dot + label + value per entry), split left/right.
 * Colors arrive as theme values from the caller.
 */
export function ChartLegend({ entries, testID, style }: ChartLegendProps) {
  const left = entries.filter((_, index) => index % 2 === 0);
  const right = entries.filter((_, index) => index % 2 === 1);
  const renderColumn = (column: LegendEntry[], key: string) => (
    <View key={key} style={{ flex: 1 }}>
      {column.map((entry) => (
        <View
          key={entry.label}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.xs }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: radius.pill,
              backgroundColor: entry.color,
              marginRight: spacing.xs,
            }}
          />
          <Text role="small">
            {entry.label} {entry.value}
          </Text>
        </View>
      ))}
    </View>
  );
  return (
    <View testID={testID} style={[{ flexDirection: "row" }, style]}>
      {renderColumn(left, "left")}
      {renderColumn(right, "right")}
    </View>
  );
}
