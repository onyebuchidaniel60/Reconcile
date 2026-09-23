import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSession } from "../src/lib/session";

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
        // With email confirmation on, there is no session yet.
        const { getSupabase } = await import("../src/lib/supabase");
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
    <View>
      <Text>Sign up</Text>
      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        accessibilityLabel="Email"
      />
      <Text>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="Password"
      />
      {error ? <Text>{error}</Text> : null}
      {needsConfirmation ? (
        <Text>Check your inbox to confirm your email, then sign in.</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create account"
        onPress={submit}
        disabled={busy}
      >
        <Text>{busy ? "Creating..." : "Create account"}</Text>
      </Pressable>
      <Link href="/signin">I already have an account</Link>
      <Link href="/welcome">Back</Link>
    </View>
  );
}
