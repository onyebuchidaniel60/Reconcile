import { View, type StyleProp, type ViewStyle } from "react-native";
import { spacing } from "../../theme/spacing";
import { PairedTitle } from "../PairedTitle";
import { Starburst } from "../Starburst";
import { Text } from "../Text";

interface ReviewHeaderProps {
  firstWord: string;
  secondWord: string;
  starburst?: boolean;
  progress?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Review Transactions header per design.md §8: transparent surface above the
 * list, paper paired title, optional signal-yellow starburst right of the
 * title block, optional muted progress line pinned right (top-right of the
 * list that follows).
 */
export function ReviewHeader({
  firstWord,
  secondWord,
  starburst = false,
  progress,
  testID,
  style,
}: ReviewHeaderProps) {
  const accessibilityLabel =
    `${firstWord} ${secondWord}` + (progress ? `, ${progress}` : "");

  return (
    <View accessibilityLabel={accessibilityLabel} testID={testID} style={style}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <PairedTitle first={firstWord} second={secondWord} color="paper" />
        </View>
        {starburst ? (
          <View style={{ marginLeft: spacing.md }}>
            <Starburst
              variant="signal-yellow"
              size={48}
              testID={testID ? `${testID}-starburst` : "review-header-starburst"}
            />
          </View>
        ) : null}
      </View>
      {progress ? (
        <View style={{ alignItems: "flex-end", marginTop: spacing.sm }}>
          <Text
            role="small"
            color="paper"
            style={{ fontWeight: "600", opacity: 0.7 }}
            testID={testID ? `${testID}-progress` : "review-header-progress"}
          >
            {progress}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
