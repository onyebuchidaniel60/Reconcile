import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { FormScaffold } from "../src/components/FormScaffold";
import { Input } from "../src/components/Input";
import { Text } from "../src/components/Text";
import { useSession } from "../src/lib/session";
import { spacing } from "../src/theme/spacing";

export default function SignInScreen() {
  const { signIn } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email || !password) {
      setError("Enter an email and a password.");
      return;
    }
    setBusy(true);
    try {
      const message = await signIn(email.trim(), password);
      if (message) {
        setError(message);
      } else {
        router.replace("/demo");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScaffold
      titleFirst="Welcome"
      titleSecond="Back."
      ctaTitle="Sign in"
      onCta={submit}
      ctaDisabled={busy}
      ctaLoading={busy}
      testID="signin"
    >
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="you@example.com"
        testID="signin-email"
      />
      <View style={{ marginTop: spacing.md }}>
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Your password"
          error={error}
          testID="signin-password"
        />
      </View>
      <Link
        href="/signup"
        testID="signin-signup"
        style={{ paddingVertical: spacing.lg }}
      >
        <Text role="small" color="ink" style={{ marginTop: spacing.md }}>
          No account yet? Create one.
        </Text>
      </Link>
    </FormScaffold>
  );
}
