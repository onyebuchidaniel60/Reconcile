import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSession } from "../src/lib/session";

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
    <View>
      <Text>Sign in</Text>
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        onPress={submit}
        disabled={busy}
      >
        <Text>{busy ? "Signing in..." : "Sign in"}</Text>
      </Pressable>
      <Link href="/signup">Create an account</Link>
      <Link href="/welcome">Back</Link>
    </View>
  );
}
