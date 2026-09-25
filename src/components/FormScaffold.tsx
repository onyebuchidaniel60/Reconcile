import { KeyboardAvoidingView, Platform, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { spacing } from "../theme/spacing";
import { Button } from "./Button";
import { PairedTitle } from "./PairedTitle";
import { Text } from "./Text";

interface FormScaffoldProps {
  titleFirst?: string;
  titleSecond?: string;
  subtitle?: string;
  ctaTitle: string;
  onCta?: () => void;
  ctaDisabled?: boolean;
  ctaAccessibilityLabel?: string;
  /** Scrollable content area by default; opt out when embedded in a scroller. */
  scroll?: boolean;
  children: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Auth/setup shell: paper background, centered content column capped for
 * tablet, optional paired title + subtitle, children (inputs), and a fixed
 * bottom action area for the primary CTA. Keyboard-aware so the focused
 * input stays visible.
 */
export function FormScaffold({
  titleFirst,
  titleSecond,
  subtitle,
  ctaTitle,
  onCta,
  ctaDisabled = false,
  ctaAccessibilityLabel,
  scroll = true,
  children,
  testID,
  style,
}: FormScaffoldProps) {
  const hasTitle = titleFirst !== undefined || titleSecond !== undefined;
  const content = (
    <View
      style={{
        flex: 1,
        width: "100%",
        maxWidth: layout.formMaxWidth,
        alignSelf: "center",
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
      }}
    >
      {hasTitle ? (
        <PairedTitle first={titleFirst ?? ""} second={titleSecond ?? ""} />
      ) : null}
      {subtitle ? (
        <Text role="body" color="ink" style={{ marginTop: spacing.md }}>
          {subtitle}
        </Text>
      ) : null}
      <View style={{ marginTop: spacing.xl }}>{children}</View>
    </View>
  );
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      testID={testID}
      style={[{ flex: 1, backgroundColor: colors.paper }, style]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        testID={testID ? `${testID}-avoider` : "form-scaffold-avoider"}
        style={{ flex: 1 }}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
        <View
          style={{
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
          }}
        >
          <Button
            title={ctaTitle}
            onPress={onCta}
            disabled={ctaDisabled}
            accessibilityLabel={ctaAccessibilityLabel}
            testID={testID ? `${testID}-cta` : "form-scaffold-cta"}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
