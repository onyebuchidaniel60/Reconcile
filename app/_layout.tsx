import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { SessionProvider, useSession } from "../src/lib/session";

const PUBLIC_ROUTES = ["welcome", "privacy", "country", "signup", "signin"];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { configured, session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || !configured) return;
    const root: string = segments[0] ?? "";
    const isPublic = PUBLIC_ROUTES.includes(root) || root === "";
    if (!session && !isPublic) {
      router.replace("/welcome");
    } else if (session && (root === "" || PUBLIC_ROUTES.includes(root))) {
      router.replace("/demo");
    }
  }, [loading, configured, session, segments, router]);

  if (!configured) {
    return (
      <View>
        <Text>Configuration missing</Text>
        <Text>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.</Text>
      </View>
    );
  }
  if (loading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <AuthGate>
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="index" options={{ title: "Reconcile" }} />
            <Stack.Screen name="welcome" options={{ title: "Welcome" }} />
            <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
            <Stack.Screen name="country" options={{ title: "Country" }} />
            <Stack.Screen name="signup" options={{ title: "Sign up" }} />
            <Stack.Screen name="signin" options={{ title: "Sign in" }} />
            <Stack.Screen name="demo" options={{ title: "Demo Mode" }} />
            <Stack.Screen name="home" options={{ title: "Home" }} />
            <Stack.Screen name="review" options={{ title: "Review" }} />
            <Stack.Screen
              name="transaction/[id]"
              options={{ title: "Transaction" }}
            />
            <Stack.Screen name="activity" options={{ title: "Activity" }} />
            <Stack.Screen name="budget-setup" options={{ title: "Budget setup" }} />
            <Stack.Screen name="budget" options={{ title: "Budget" }} />
            <Stack.Screen name="insights" options={{ title: "Insights" }} />
            <Stack.Screen name="ask" options={{ title: "Ask Reconcile" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
          </Stack>
        </AuthGate>
      </SessionProvider>
    </ErrorBoundary>
  );
}
