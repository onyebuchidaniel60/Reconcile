import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../src/theme/tokens";

// Phase 1 placeholder. Real Activity experience lands in later phases.
export default function ActivityScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.subtitle}>Placeholder — no domain logic in Phase 1.</Text>
      <Link href="/" style={styles.link}>
        Back home
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.titleSize,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: typography.bodySize,
    color: colors.ink,
  },
  link: {
    marginTop: spacing.lg,
    fontSize: typography.bodySize,
    color: colors.ink,
    textDecorationLine: "underline",
  },
});
