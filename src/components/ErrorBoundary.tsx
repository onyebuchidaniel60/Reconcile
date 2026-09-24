import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { body, colors, h2, radius, spacing } from "../theme";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Minimal crash guard for the app shell. Shows a user-safe fallback and a
 * retry action. Never renders error details, and never logs financial data
 * (none exists in Phase 1).
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // Keep the log free of anything sensitive: error identity only.
    console.error("[Reconcile] Unhandled UI error captured", error);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            Please try again. If it keeps happening, restart the app.
          </Text>
          <Pressable
            style={styles.button}
            onPress={this.handleRetry}
            accessibilityRole="button"
          >
            <Text style={styles.buttonLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
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
    textAlign: "center",
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: body.fontSize,
    color: colors.ink,
    textAlign: "center",
  },
  button: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.signalYellow,
  },
  buttonLabel: {
    fontSize: body.fontSize,
    fontWeight: "700",
    color: colors.ink,
  },
});
