import { Link } from "expo-router";
import { Text, View } from "react-native";

// Phase 1 placeholder. Real Home experience lands in later phases.
export default function HomeScreen() {
  return (
    <View>
      <Text>Home</Text>
      <Link href="/activity">Activity</Link>
      <Link href="/budget">Budget</Link>
      <Link href="/insights">Insights</Link>
    </View>
  );
}
