import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { formatMinor } from "../../../supabase/functions/_shared/finance";
import { select } from "../../lib/haptics";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { Card } from "../Card";
import { ChartLegend } from "../ChartLegend";
import { Donut } from "../Donut";
import { Text } from "../Text";

interface HeroSummaryCardProps {
  period: string;
  total: number;
  income: number;
  expenses: number;
  currency: string;
  onPressPeriod?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Home hero per design.md §8: yellow card with a "Summary" label, an inline
 * period selector (pressable text + chevron; selection itself is a Phase 8
 * concern), an income/expenses Donut, and a split legend. Composes Card,
 * Donut, ChartLegend, and Text — nothing re-implemented.
 */
export function HeroSummaryCard({
  period,
  total,
  income,
  expenses,
  currency,
  onPressPeriod,
  testID,
  style,
}: HeroSummaryCardProps) {
  const split = total > 0 ? income / total : 0;
  const accessibilityLabel =
    `Summary for ${period}. ` +
    `Income ${formatMinor(income, currency)}, ` +
    `expenses ${formatMinor(expenses, currency)}.`;

  const handlePressPeriod = (): void => {
    void select();
    onPressPeriod?.();
  };

  return (
    <View accessibilityLabel={accessibilityLabel} testID={testID} style={style}>
      <Card variant="yellow">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text role="small" color="ink" style={{ fontWeight: "600" }}>
            Summary
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change period, currently ${period}`}
            onPress={onPressPeriod ? handlePressPeriod : undefined}
            testID={testID ? `${testID}-period` : "hero-summary-period"}
            style={{
              flexDirection: "row",
              alignItems: "center",
              // design.md §10: 44×44 minimum; alignItems keeps it centered.
              minHeight: 44,
            }}
          >
            <Text role="small" color="ink" style={{ fontWeight: "600" }}>
              {period}
            </Text>
            <ChevronDown size={20} color={colors.ink} strokeWidth={1.5} />
          </Pressable>
        </View>
        <View style={{ marginTop: spacing.md, alignItems: "center" }}>
          <Donut
            total={total}
            primary={split}
            currency={currency}
            labels={{ primary: "Income", secondary: "Expenses" }}
            showLegend={false}
            testID={testID ? `${testID}-donut` : "hero-summary-donut"}
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <ChartLegend
            entries={[
              {
                color: colors.paper,
                label: "Income",
                value: formatMinor(income, currency),
              },
              {
                color: colors.ink,
                label: "Expenses",
                value: formatMinor(expenses, currency),
              },
            ]}
            testID={testID ? `${testID}-legend` : "hero-summary-legend"}
          />
        </View>
      </Card>
    </View>
  );
}
