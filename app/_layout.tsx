import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "../src/components/ErrorBoundary";

// Phase 1: minimal navigation shell only. No auth, no domain screens.
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
