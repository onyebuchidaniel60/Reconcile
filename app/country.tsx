import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { Button } from "../src/components/Button";
import { Chip } from "../src/components/Chip";
import { FormScaffold } from "../src/components/FormScaffold";
import { Text } from "../src/components/Text";
import { spacing } from "../src/theme/spacing";

const ENABLED = "Nigeria";
const COMING_SOON = ["Ghana", "Kenya", "South Africa"];

export default function CountryScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState(ENABLED);
  return (
    <FormScaffold
      titleFirst="Your"
      titleSecond="Country."
      subtitle="Your country decides which bank providers Reconcile can connect. Nigeria is live today."
      ctaTitle="Continue"
      onCta={() => router.push("/signup")}
      testID="country"
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <View style={{ margin: spacing.xs }}>
          <Chip
            label={ENABLED}
            selected={selected === ENABLED}
            onPress={() => setSelected(ENABLED)}
            testID="country-nigeria"
          />
        </View>
        {COMING_SOON.map((country) => (
          <View
            key={country}
            style={{
              flexDirection: "row",
              alignItems: "center",
              margin: spacing.xs,
            }}
          >
            <Chip label={country} testID={`country-${country}`} />
            <Text role="small" color="ink" style={{ opacity: 0.6, marginLeft: spacing.xs }}>
              Coming soon
            </Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: spacing.md }}>
        <Button
          title="Back"
          variant="ghost"
          onPress={() => router.push("/privacy")}
          testID="country-back"
        />
      </View>
    </FormScaffold>
  );
}
