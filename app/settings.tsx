import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  disconnectConnection,
  getAccounts,
  getActiveConnection,
  type BankAccount,
} from "../src/lib/db";
import { useSession } from "../src/lib/session";

export default function SettingsScreen() {
  const { session, signOut } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    const connection = await getActiveConnection();
    const list = connection ? await getAccounts() : [];
    return { connection, list };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { connection, list } = await fetchData();
      setConnectionId(connection?.id ?? null);
      setAccounts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { connection, list } = await fetchData();
        if (!active) return;
        setConnectionId(connection?.id ?? null);
        setAccounts(list);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load settings.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

  const disconnect = async () => {
    if (!connectionId) return;
    setBusy(true);
    setError(null);
    try {
      await disconnectConnection(connectionId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed.");
    } finally {
      setBusy(false);
    }
  };

  const out = async () => {
    await signOut();
    router.replace("/welcome");
  };

  if (loading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>Settings</Text>
      <Text>Signed in as {session?.user.email ?? "unknown"}</Text>
      {error ? <Text>{error}</Text> : null}
      <Text>Demo accounts:</Text>
      {accounts.length === 0 ? <Text>No connected accounts.</Text> : null}
      {accounts.map((a) => (
        <Text key={a.id}>
          {a.display_name} {a.masked_account_number}
        </Text>
      ))}
      {connectionId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Disconnect demo accounts"
          onPress={disconnect}
          disabled={busy}
        >
          <Text>Disconnect demo accounts</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={out}>
        <Text>Sign out</Text>
      </Pressable>
      <Link href="/home">Back home</Link>
    </View>
  );
}
