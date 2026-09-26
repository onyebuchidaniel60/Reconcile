import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { FormScaffold } from "../src/components/FormScaffold";
import { Input } from "../src/components/Input";
import { Text } from "../src/components/Text";
import { useSession } from "../src/lib/session";
import { getSupabase } from "../src/lib/supabase";
import { spacing } from "../src/theme/spacing";

export default function SignUpScreen() {
  const { signUp } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const submit = async () => {
    setError(null);
    setNeedsConfirmation(false);
    if (!email || !password) {
      setError("Enter an email and a password.");
      return;
    }
    setBusy(true);
    try {
      const message = await signUp(email.trim(), password);
      if (message) {
        setError(message);
      } else {
        const { data } = await getSupabase().auth.getSession();
        if (data.session) {
          router.replace("/demo");
        } else {
          setNeedsConfirmation(true);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScaffold
      titleFirst="Create"
      titleSecond="Account."
      ctaTitle="Create account"
      onCta={submit}
      ctaDisabled={busy}
      ctaLoading={busy}
      testID="signup"
    >
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="you@example.com"
        testID="signup-email"
      />
      <View style={{ marginTop: spacing.md }}>
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Choose a password"
          error={error}
          testID="signup-password"
        />
      </View>
      {needsConfirmation ? (
        <Text role="body" color="ink" style={{ marginTop: spacing.md }}>
          Check your inbox to confirm your email, then sign in.
        </Text>
      ) : null}
      <Link
        href="/signin"
        testID="signup-signin"
        style={{ paddingVertical: spacing.lg }}
      >
        <Text role="small" color="ink" style={{ marginTop: spacing.md }}>
          Already have an account? Sign in.
        </Text>
      </Link>
    </FormScaffold>
  );
}
