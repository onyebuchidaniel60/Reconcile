import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { spacing } from "../theme/spacing";
import { Button } from "./Button";
import { Text } from "./Text";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  /** Machine code for logs only. Never rendered — the user sees `message`. */
  errorCode?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Error state per design.md §7: one body sentence in ink, one secondary
 * retry action, centered vertically. An optional error code is accepted
 * for logging only and is never displayed to the user.
 */
export function ErrorState({
  message,
  onRetry,
  retryLabel = "Try again",
  errorCode,
  testID,
  style,
}: ErrorStateProps) {
  useEffect(() => {
    if (errorCode) {
      console.warn(`[ErrorState] ${errorCode}`);
    }
  }, [errorCode]);

  return (
    <View
      accessibilityLabel={message}
      testID={testID}
      style={[
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.xl,
        },
        style,
      ]}
    >
      <Text role="body" color="ink" style={{ textAlign: "center" }}>
        {message}
      </Text>
      <View style={{ marginTop: spacing.md }}>
        <Button
          title={retryLabel}
          variant="secondary"
          onPress={onRetry}
          testID={testID ? `${testID}-retry` : "error-state-retry"}
        />
      </View>
    </View>
  );
}
