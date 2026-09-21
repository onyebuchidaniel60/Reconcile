import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../src/theme/tokens";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Not found" }} />
      <Text style={styles.title}>Not found</Text>
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
  link: {
    marginTop: spacing.lg,
    fontSize: typography.bodySize,
    color: colors.ink,
    textDecorationLine: "underline",
  },
});
