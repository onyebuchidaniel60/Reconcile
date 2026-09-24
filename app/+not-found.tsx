import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { body, colors, h2, spacing } from "../src/theme";

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
    padding: spacing.xl,
  },
  title: {
    fontSize: h2.fontSize,
    fontWeight: h2.fontWeight,
    color: colors.ink,
  },
  link: {
    marginTop: spacing.xl,
    fontSize: body.fontSize,
    color: colors.ink,
    textDecorationLine: "underline",
  },
});
