import { View, type StyleProp, type ViewStyle } from "react-native";
import { spacing } from "../../theme/spacing";
import { Card } from "../Card";
import { Text } from "../Text";

interface PositiveMessageCardProps {
  message: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Reassuring mint card per design.md §8: one sentence, ink, nothing else.
 * Compact radius with 16px padding via a token style override; Card's own
 * 20/24 padding contract stays intact.
 */
export function PositiveMessageCard({ message, testID, style }: PositiveMessageCardProps) {
  return (
    <View accessibilityLabel={message} testID={testID} style={style}>
      <Card variant="mint" compact style={{ padding: spacing.lg }}>
        <Text role="body" color="ink" style={{ fontWeight: "500" }}>
          {message}
        </Text>
      </Card>
    </View>
  );
}
