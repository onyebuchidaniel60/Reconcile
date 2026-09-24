import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { formatMinor } from "../../supabase/functions/_shared/finance";
import { select } from "../lib/haptics";
import { colors } from "../theme/colors";
import type { CategoryTintName } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { CategoryCircle } from "./CategoryCircle";
import { Text } from "./Text";

export type TransactionDirection = "expense" | "income" | "refund" | "internal_transfer";

export type TransactionSurface = "light" | "dark";

interface TransactionRowProps {
  merchant: string;
  date: string;
  amount: number;
  currency: string;
  category: CategoryTintName;
  direction: TransactionDirection;
  surface?: TransactionSurface;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const SIGN_PREFIX: Record<TransactionDirection, string> = {
  expense: "-",
  income: "+",
  refund: "+",
  // Internal transfers are neutral: no sign, muted row, neutral circle.
  internal_transfer: "",
};

const DIRECTION_WORD: Record<TransactionDirection, string> = {
  expense: "debit",
  income: "credit",
  refund: "credit",
  internal_transfer: "transfer",
};

/**
 * Transaction row per design.md §7: leading 40px CategoryCircle, merchant
 * (body 500) + date (small muted) column, trailing mono amount (tabular,
 * right-aligned). Row height 64–72px; no separator, spacing does the work.
 * Direction controls the sign prefix; internal transfers render muted with
 * a neutral gray circle instead of a category tint. Composes CategoryCircle
 * and Text — it never re-implements circle or text rendering.
 */
export function TransactionRow({
  merchant,
  date,
  amount,
  currency,
  category,
  direction,
  surface = "light",
  onPress,
  testID,
  style,
}: TransactionRowProps) {
  const dark = surface === "dark";
  const muted = direction === "internal_transfer";
  const ink: "ink" | "paper" = dark ? "paper" : "ink";
  const formatted = `${SIGN_PREFIX[direction]}${formatMinor(amount, currency)}`;
  const accessibilityLabel =
    `${merchant}, ${category}, ${formatMinor(amount, currency)} ` +
    `${DIRECTION_WORD[direction]}, ${date}`;

  const handlePress = (): void => {
    void select();
    onPress?.();
  };

  const row = (
    <View
      accessibilityLabel={onPress ? undefined : accessibilityLabel}
      testID={testID}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          minHeight: 64,
          paddingVertical: spacing.sm,
          opacity: muted ? 0.6 : 1,
        },
        style,
      ]}
    >
      {muted ? (
        <CategoryCircle
          category="Internal Transfer"
          style={{ backgroundColor: colors.line }}
        />
      ) : (
        <CategoryCircle category={category} />
      )}
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text role="body" color={ink} style={{ fontWeight: "500" }} numberOfLines={1}>
          {merchant}
        </Text>
        <Text role="small" color={ink} style={{ opacity: 0.6 }} numberOfLines={1}>
          {date}
        </Text>
      </View>
      <Text
        role="mono"
        color={ink}
        style={{ fontWeight: "600", textAlign: "right", fontVariant: ["tabular-nums"] }}
      >
        {formatted}
      </Text>
    </View>
  );

  if (!onPress) return row;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
    >
      {row}
    </Pressable>
  );
}
