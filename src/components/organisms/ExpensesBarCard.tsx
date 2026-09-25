import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { select } from "../../lib/haptics";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { BarChart, type BarAxisTick, type BarDatum } from "../BarChart";
import { Card } from "../Card";
import { Text } from "../Text";

interface ExpensesBarCardProps {
  bars: BarDatum[];
  axisTicks: BarAxisTick[];
  /** Alert-red starburst callout above the highlighted bar, e.g. "-₦150,000". */
  callout: string;
  currency: string;
  onPressRange?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Expenses card per design.md §8: yellow card with a pressable range header
 * (selection itself is a Phase 8 concern) and a 4-bar chart with exactly one
 * hatched highlight plus an alert-red starburst callout through BarChart's
 * own callout slot. The one-hatched-bar rule is enforced by
 * `validateBarFills`, not re-implemented here.
 */
export function ExpensesBarCard({
  bars,
  axisTicks,
  callout,
  currency,
  onPressRange,
  testID,
  style,
}: ExpensesBarCardProps) {
  const handlePressRange = (): void => {
    void select();
    onPressRange?.();
  };

  return (
    <View
      accessibilityLabel={`Expenses over the last 4 months in ${currency}.`}
      testID={testID}
      style={style}
    >
      <Card variant="yellow">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change expenses range"
          onPress={onPressRange ? handlePressRange : undefined}
          testID={testID ? `${testID}-range` : "expenses-bar-range"}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text role="small" color="ink" style={{ fontWeight: "600" }}>
            Expenses — Last 4 months
          </Text>
          <ChevronDown size={20} color={colors.ink} strokeWidth={1.5} />
        </Pressable>
        <View style={{ marginTop: spacing.md }}>
          <BarChart
            bars={bars}
            axisTicks={axisTicks}
            calloutText={callout}
            testID={testID ? `${testID}-chart` : "expenses-bar-chart"}
          />
        </View>
      </Card>
    </View>
  );
}
