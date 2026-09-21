import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { env } from "../src/lib/env";
import { colors, radii, spacing, typography } from "../src/theme/tokens";

// Phase 1 placeholder. Real Home experience lands in later phases.
const LINKS = [
  { href: "/activity", label: "Activity" },
  { href: "/budget", label: "Budget" },
  { href: "/insights", label: "Insights" },
] as const;

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reconcile</Text>
      <Text style={styles.subtitle}>Phase 1 foundation shell</Text>
      <Text style={styles.badge}>env: {env.appEnv}</Text>
      <View style={styles.links}>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} style={styles.link}>
            {link.label}
          </Link>
        ))}
      </View>
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
    fontSize: typography.heroSize,
    fontWeight: "800",
    color: colors.ink,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: typography.bodySize,
    color: colors.ink,
  },
  badge: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.signalYellow,
    color: colors.ink,
    fontSize: typography.captionSize,
    overflow: "hidden",
  },
  links: {
    marginTop: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
  },
  link: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ink,
    color: colors.paper,
    fontSize: typography.bodySize,
    overflow: "hidden",
  },
});
