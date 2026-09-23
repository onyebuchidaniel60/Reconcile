import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function PrivacyScreen() {
  return (
    <View>
      <Text>Privacy</Text>
      <Text>What Reconcile can see:</Text>
      <Text>
        Transaction amounts, dates, and merchant names from accounts you connect
        or from clearly labeled demo data.
      </Text>
      <Text>What Reconcile cannot see:</Text>
      <Text>
        Your bank passwords, PINs, or one-time codes. Reconcile never moves
        money and never stores bank credentials.
      </Text>
      <Link href="/country">Continue</Link>
      <Link href="/welcome">Back</Link>
    </View>
  );
}
