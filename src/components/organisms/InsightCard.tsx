import { View, type StyleProp, type ViewStyle } from "react-native";
import { formatMinor } from "../../../supabase/functions/_shared/finance";
import { spacing } from "../../theme/spacing";
import { Card } from "../Card";
import { Starburst } from "../Starburst";
import { Text } from "../Text";

export type DeltaDirection = "up" | "down" | "flat";

export type InsightSurface = "paper" | "yellow" | "ink";

interface InsightCardProps {
  label: string;
  primary: number;
  secondary: number;
  /** Unsigned percentage value; the direction supplies arrow and sign. */
  delta: number;
  deltaDirection: DeltaDirection;
  explanation: string;
  currency: string;
  /** design.md §8: yellow for month compare, ink for biggest change. */
  surface?: InsightSurface;
  /** Paper starburst accent for the ink card (design.md §8). */
  starburst?: boolean;
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
  surface = "paper",
  starburst = false,
  testID,
  style,
}: InsightCardProps) {
  const deltaText = `${ARROW[deltaDirection]} ${SIGN[deltaDirection]}${delta}%`;
  // Ink text on paper/yellow; paper text on ink (design.md §3 pairings).
  const tone: "ink" | "paper" = surface === "ink" ? "paper" : "ink";
  const accessibilityLabel =
    `${label}: ${formatMinor(primary, currency)} versus ` +
    `${formatMinor(secondary, currency)}, ${WORD[deltaDirection]} ` +
    `${delta} percent. ${explanation}`;

  return (
    <View accessibilityLabel={accessibilityLabel} testID={testID} style={style}>
      <Card variant={surface} compact>
        {starburst ? (
          <View style={{ position: "absolute", top: 0, right: 0 }}>
            <Starburst
              variant="paper"
              size={32}
              testID={testID ? `${testID}-starburst` : "insight-starburst"}
            />
          </View>
        ) : null}
        <Text role="small" color={tone} style={{ fontWeight: "600", opacity: 0.6 }}>
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
            <Text role="small" color={tone} style={{ fontWeight: "600" }} numberOfLines={1}>
              {formatMinor(primary, currency)}
            </Text>
          </View>
          <Text
            role="small"
            color={tone}
            style={{ fontWeight: "600", marginHorizontal: spacing.xs }}
            testID={testID ? `${testID}-delta` : "insight-delta"}
          >
            {deltaText}
          </Text>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text role="small" color={tone} style={{ fontWeight: "600" }} numberOfLines={1}>
              {formatMinor(secondary, currency)}
            </Text>
          </View>
        </View>
        <Text role="body" color={tone} style={{ marginTop: spacing.md }}>
          {explanation}
        </Text>
      </Card>
    </View>
  );
}
