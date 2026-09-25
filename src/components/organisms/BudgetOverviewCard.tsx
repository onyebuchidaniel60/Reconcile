import { View, type StyleProp, type ViewStyle } from "react-native";
import { formatMinor } from "../../../supabase/functions/_shared/finance";
import { spacing } from "../../theme/spacing";
import { Card } from "../Card";
import { PillBadge } from "../PillBadge";
import { ProgressBar } from "../ProgressBar";
import { Text } from "../Text";

interface BudgetOverviewCardProps {
  spent: number;
  limit: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  /** Fraction of the limit spent, 0..1. */
  progress: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Budget overview per design.md §8: mist card with a "Budget Overview"
 * label, a dark "Today" pill, an ink progress bar with a percentage label,
 * and muted date-range ends. Spent/limit feed the accessible description;
 * the bar itself carries the visual percentage.
 */
export function BudgetOverviewCard({
  spent,
  limit,
  currency,
  periodStart,
  periodEnd,
  progress,
  testID,
  style,
}: BudgetOverviewCardProps) {
  const percent = `${Math.round(progress * 100)}%`;
  const accessibilityLabel =
    `Budget overview. Spent ${formatMinor(spent, currency)} ` +
    `of ${formatMinor(limit, currency)}, ${periodStart} to ${periodEnd}.`;

  return (
    <View accessibilityLabel={accessibilityLabel} testID={testID} style={style}>
      <Card variant="mist" compact>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text role="small" color="ink" style={{ fontWeight: "600" }}>
            Budget Overview
          </Text>
          <PillBadge
            label="Today"
            variant="dark"
            testID={testID ? `${testID}-today` : "budget-overview-today"}
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <ProgressBar
            value={progress}
            label={percent}
            variant="light"
            testID={testID ? `${testID}-progress` : "budget-overview-progress"}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: spacing.sm,
          }}
        >
          <Text role="small" color="ink" style={{ opacity: 0.6 }}>
            {periodStart}
          </Text>
          <Text role="small" color="ink" style={{ opacity: 0.6 }}>
            {periodEnd}
          </Text>
        </View>
      </Card>
    </View>
  );
}
