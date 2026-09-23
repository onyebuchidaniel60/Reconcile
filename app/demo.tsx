import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  connectDemo,
  getAccounts,
  getActiveConnection,
  syncConnection,
  type BankAccount,
} from "../src/lib/db";

export default function DemoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);

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
      setError(e instanceof Error ? e.message : "Could not load demo state.");
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
        setError(e instanceof Error ? e.message : "Could not load demo state.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

  const enter = async () => {
    setBusy(true);
    setError(null);
    setSyncInfo(null);
    try {
      const { connection } = await connectDemo();
      const result = await syncConnection(connection.id, "initial");
      setSyncInfo(
        `Synced ${result.seen} transactions, added ${result.added}.`,
      );
      router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo setup failed.");
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    if (!connectionId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await syncConnection(connectionId, "manual");
      setSyncInfo(
        `Synced ${result.seen} transactions, added ${result.added}. ` +
          `${result.internal_transfer_pairs} internal transfer pair(s) detected.`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
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
      <Text>Demo Mode</Text>
      <Text>
        Demo data is synthetic: GTBank, UBA, and Sterling accounts with
        generated transactions. No real bank is connected.
      </Text>
      {error ? <Text>{error}</Text> : null}
      {syncInfo ? <Text>{syncInfo}</Text> : null}
      {connectionId === null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter demo mode"
          onPress={enter}
          disabled={busy}
        >
          <Text>{busy ? "Setting up..." : "Enter Demo Mode"}</Text>
        </Pressable>
      ) : (
        <View>
          <Text>Demo accounts:</Text>
          {accounts.length === 0 ? <Text>No accounts yet.</Text> : null}
          {accounts.map((a) => (
            <Text key={a.id}>
              {a.display_name} {a.masked_account_number}
            </Text>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sync now"
            onPress={syncNow}
            disabled={busy}
          >
            <Text>{busy ? "Syncing..." : "Sync now"}</Text>
          </Pressable>
          <Link href="/home">Continue to Home</Link>
        </View>
      )}
      <Link href="/welcome">Back</Link>
    </View>
  );
}
