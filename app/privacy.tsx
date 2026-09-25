import { useRouter } from "expo-router";
import { View } from "react-native";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { Divider } from "../src/components/Divider";
import { FormScaffold } from "../src/components/FormScaffold";
import { Text } from "../src/components/Text";
import { spacing } from "../src/theme/spacing";

const ROWS: { label: string; value: string }[] = [
  { label: "Bank password", value: "No" },
  { label: "Bank PIN", value: "No" },
  { label: "OTP", value: "No" },
  { label: "Account balance", value: "Yes, to show you" },
  { label: "Transaction amount", value: "Yes, to categorize it" },
  { label: "Transaction date", value: "Yes" },
  { label: "Transaction narration", value: "Yes" },
  { label: "Account identifier", value: "Yes, where needed" },
  { label: "Money movement", value: "No" },
];

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <FormScaffold
      titleFirst="Your"
      titleSecond="Privacy."
      subtitle="Reconcile reads bank data. It never moves money and never stores bank credentials."
      ctaTitle="Continue"
      onCta={() => router.push("/country")}
      testID="privacy"
    >
      <Card variant="paper" testID="privacy-table">
        {ROWS.map((row, index) => (
          <View key={row.label}>
            {index > 0 ? <Divider /> : null}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: spacing.sm,
              }}
            >
              <Text role="small" color="ink" style={{ fontWeight: "600", flexShrink: 1 }}>
                {row.label}
              </Text>
              <Text role="body" color="ink" style={{ textAlign: "right", marginLeft: spacing.md }}>
                {row.value}
              </Text>
            </View>
          </View>
        ))}
      </Card>
      <View style={{ marginTop: spacing.md }}>
        <Button
          title="Back"
          variant="ghost"
          onPress={() => router.push("/welcome")}
          testID="privacy-back"
        />
      </View>
    </FormScaffold>
  );
}
