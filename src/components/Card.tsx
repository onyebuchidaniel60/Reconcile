import { View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";

export type CardVariant = "paper" | "yellow" | "ink" | "mist" | "mint" | "coral";

interface CardProps {
  variant?: CardVariant;
  compact?: boolean;
  padding?: 20 | 24;
  children: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const BACKGROUNDS: Record<CardVariant, string> = {
  paper: colors.paper,
  yellow: colors.signalYellow,
  ink: colors.ink,
  mist: colors.mist,
  mint: colors.mint,
  coral: colors.coral,
};

/**
 * Surface card per design.md §7. Main cards use radius 28, compact cards
 * radius 20. Padding is 20 or 24 (default 20), never mixed inside one card.
 * No shadow; the paper variant carries a quiet line border. Cards must not
 * be nested more than one level deep (a usage rule, not enforced in code).
 */
export function Card({
  variant = "paper",
  compact = false,
  padding = 20,
  children,
  testID,
  style,
}: CardProps) {
  return (
    <View
      testID={testID}
      style={[
        {
          borderRadius: compact ? radius.compact : radius.card,
          backgroundColor: BACKGROUNDS[variant],
          padding,
          borderWidth: variant === "paper" ? 1 : 0,
          borderColor: colors.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
