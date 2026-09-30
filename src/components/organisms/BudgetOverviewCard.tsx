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
  /** Fraction of the limit spent. Uncapped; the bar clamps its own fill. */
  progress: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Budget overview per design.md §8 Home: mist card with a "Budget Overview"
 * label, a dark "Today" pill, the tall usage bar (filled portion, a white
 * pill carrying the percentage over it, and a hatched remainder for what is
 * left), then a split Spent / Left row so both numbers are readable without
 * arithmetic, then the date range. Over budget the bar fills Alert Red
 * (design.md §7 over-budget variant) and the right row becomes "Over".
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
  // Display only — forecast math is untouched. The bar clamps its fill to
  // full while the label stays uncapped (design.md §7 over-budget variant).
  const over = limit > 0 && spent > limit;
  const remaining = Math.max(limit - spent, 0);
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
            variant={over ? "over-budget" : "light"}
            size="large"
            hatched
            testID={testID ? `${testID}-progress` : "budget-overview-progress"}
          />
        </View>
        {/* Spent / Left: the two halves of the bar, named. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginTop: spacing.md,
          }}
        >
          <View style={{ flexShrink: 1 }}>
            <Text role="small" color="ink" style={{ fontWeight: "600", opacity: 0.6 }}>
              Spent
            </Text>
            <Text
              role="body"
              color="ink"
              style={{ fontWeight: "600", fontVariant: ["tabular-nums"] }}
              numberOfLines={1}
              testID={testID ? `${testID}-spent` : "budget-overview-spent"}
            >
              {formatMinor(spent, currency)}
            </Text>
          </View>
          <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
            <Text role="small" color="ink" style={{ fontWeight: "600", opacity: 0.6 }}>
              {over ? "Over" : "Left"}
            </Text>
            <Text
              role="body"
              color={over ? "alertRed" : "ink"}
              style={{ fontWeight: "600", fontVariant: ["tabular-nums"], textAlign: "right" }}
              numberOfLines={1}
              testID={testID ? `${testID}-left` : "budget-overview-left"}
            >
              {formatMinor(over ? spent - limit : remaining, currency)}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: spacing.sm,
          }}
        >
          <Text role="small" color="ink" style={{ opacity: 0.6 }} numberOfLines={1}>
            {periodStart}
          </Text>
          <Text role="small" color="ink" style={{ opacity: 0.6 }} numberOfLines={1}>
            {periodEnd}
          </Text>
        </View>
      </Card>
    </View>
  );
}
