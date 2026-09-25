import { View, type StyleProp, type ViewStyle } from "react-native";
import { formatMinor } from "../../../supabase/functions/_shared/finance";
import { spacing } from "../../theme/spacing";
import { Card } from "../Card";
import { LineChart, type LinePoint } from "../LineChart";
import { Starburst } from "../Starburst";
import { Text } from "../Text";

interface SpendTrendCardProps {
  spent: number;
  limit: number;
  currency: string;
  points: LinePoint[];
  projectedFrom?: number;
  axisTicks: { value: number; label: string }[];
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Spend trend per design.md §8: ink card with a centered paper hero amount
 * (display, stepping down to h1 for long currency strings so realistic NGN
 * totals never clip), a muted "spent out of" line, a paper starburst in the
 * top-right corner, and a yellow line chart with an optional dashed
 * projection segment.
 */
export function SpendTrendCard({
  spent,
  limit,
  currency,
  points,
  projectedFrom,
  axisTicks,
  testID,
  style,
}: SpendTrendCardProps) {
  const accessibilityLabel =
    `Spent ${formatMinor(spent, currency)} ` +
    `out of ${formatMinor(limit, currency)}.`;
  const amountLabel = formatMinor(spent, currency);

  return (
    <View accessibilityLabel={accessibilityLabel} testID={testID} style={style}>
      <Card variant="ink">
        <View style={{ position: "absolute", top: 0, right: 0 }}>
          <Starburst
            variant="paper"
            size={32}
            testID={testID ? `${testID}-starburst` : "spend-trend-starburst"}
          />
        </View>
        <Text
          role={amountLabel.length > 10 ? "h1" : "display"}
          color="paper"
          style={{ textAlign: "center" }}
        >
          {amountLabel}
        </Text>
        <Text
          role="small"
          color="paper"
          style={{ opacity: 0.6, textAlign: "center", marginTop: spacing.xs }}
        >
          Spent out of {formatMinor(limit, currency)}
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <LineChart
            points={points}
            projectedFrom={projectedFrom}
            axisTicks={axisTicks}
            testID={testID ? `${testID}-chart` : "spend-trend-chart"}
          />
        </View>
      </Card>
    </View>
  );
}
