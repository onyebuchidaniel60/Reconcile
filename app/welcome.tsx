import { Link, useRouter } from "expo-router";
import { View } from "react-native";
import { FormScaffold } from "../src/components/FormScaffold";
import { Starburst } from "../src/components/Starburst";
import { Text } from "../src/components/Text";
import { spacing } from "../src/theme/spacing";

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <FormScaffold
      titleFirst="Get"
      titleSecond="Started"
      subtitle="Connect your banks, reconcile your transactions, and understand where your money is going."
      ctaTitle="Continue"
      onCta={() => router.push("/privacy")}
      testID="welcome"
    >
      <View style={{ alignItems: "center", marginVertical: spacing.md }}>
        <Starburst variant="signal-yellow" size={48} testID="welcome-accent" />
      </View>
      <Link
        href="/signin"
        testID="welcome-signin"
        style={{ paddingVertical: spacing.lg }}
      >
        <Text role="small" color="ink" style={{ textAlign: "center" }}>
          I already have an account? Sign in.
        </Text>
      </Link>
    </FormScaffold>
  );
}
