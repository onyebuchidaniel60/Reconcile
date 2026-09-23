import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function WelcomeScreen() {
  return (
    <View>
      <Text>Reconcile</Text>
      <Text>
        Connect your banks, reconcile your transactions, and understand where
        your money is going.
      </Text>
      <Link href="/signup">Get started</Link>
      <Link href="/signin">I already have an account</Link>
      <Link href="/privacy">Privacy first</Link>
    </View>
  );
}
