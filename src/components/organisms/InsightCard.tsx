import { View, type StyleProp, type ViewStyle } from "react-native";
import { formatMinor } from "../../../supabase/functions/_shared/finance";
import { spacing } from "../../theme/spacing";
import { Card } from "../Card";
import { Text } from "../Text";

export type DeltaDirection = "up" | "down" | "flat";

interface InsightCardProps {
  label: string;
  primary: number;
  secondary: number;
  /** Unsigned percentage value; the direction supplies arrow and sign. */
  delta: number;
  deltaDirection: DeltaDirection;
  explanation: string;
  currency: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const ARROW: Record<DeltaDirection, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

const SIGN: Record<DeltaDirection, string> = {
  up: "+",
  down: "-",
  flat: "",
};

const WORD: Record<DeltaDirection, string> = {
  up: "up",
  down: "down",
  flat: "unchanged",
};

/**
 * Insight card for Insights: muted label, paired small-600 amounts
 * left/right with an ink delta indicator between them (arrow + sign carry
 * direction, never color), and a one-sentence explanation. Amounts stay at
 * the small scale so realistic NGN pairs fit one row on both surfaces —
 * larger roles clip on 360px widths (adjustsFontSizeToFit is iOS-only, so a
 * single scale is used everywhere).
 */
export function InsightCard({
  label,
  primary,
  secondary,
  delta,
  deltaDirection,
  explanation,
  currency,
  testID,
  style,
}: InsightCardProps) {
  const deltaText = `${ARROW[deltaDirection]} ${SIGN[deltaDirection]}${delta}%`;
  const accessibilityLabel =
    `${label}: ${formatMinor(primary, currency)} versus ` +
    `${formatMinor(secondary, currency)}, ${WORD[deltaDirection]} ` +
    `${delta} percent. ${explanation}`;

  return (
    <View accessibilityLabel={accessibilityLabel} testID={testID} style={style}>
      <Card variant="paper" compact>
        <Text role="small" color="ink" style={{ fontWeight: "600", opacity: 0.6 }}>
          {label}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text role="small" color="ink" style={{ fontWeight: "600" }} numberOfLines={1}>
              {formatMinor(primary, currency)}
            </Text>
          </View>
          <Text
            role="small"
            color="ink"
            style={{ fontWeight: "600", marginHorizontal: spacing.xs }}
            testID={testID ? `${testID}-delta` : "insight-delta"}
          >
            {deltaText}
          </Text>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text role="small" color="ink" style={{ fontWeight: "600" }} numberOfLines={1}>
              {formatMinor(secondary, currency)}
            </Text>
          </View>
        </View>
        <Text role="body" color="ink" style={{ marginTop: spacing.md }}>
          {explanation}
        </Text>
      </Card>
    </View>
  );
}
