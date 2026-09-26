import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Constants from "expo-constants";
import { ChevronRight, CircleUser, CreditCard, Info, LogOut, Shield } from "lucide-react-native";
import { Card } from "../src/components/Card";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorState } from "../src/components/ErrorState";
import { LoadingState } from "../src/components/LoadingState";
import { PillNav } from "../src/components/PillNav";
import { ScreenScaffold } from "../src/components/ScreenScaffold";
import { Text } from "../src/components/Text";
import {
  disconnectConnection,
  getAccounts,
  getActiveConnection,
  type BankAccount,
} from "../src/lib/db";
import { useSession } from "../src/lib/session";
import { colors } from "../src/theme/colors";
import { radius } from "../src/theme/radius";
import { spacing } from "../src/theme/spacing";

const PILL_ROUTES = {
  home: "/home",
  activity: "/activity",
  budget: "/budget",
  insights: "/insights",
} as const;

function SettingRow({
  icon,
  label,
  hint,
  onPress,
  testID,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onPress?: () => void;
  testID?: string;
}) {
  const content = (
    <>
      {icon}
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text role="body" color="ink" style={{ fontWeight: "500" }} numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text role="small" color="ink" style={{ opacity: 0.6 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={colors.ink} strokeWidth={1.5} />
    </>
  );
  const style = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: spacing.sm,
  };
  if (!onPress) {
    return (
      <View testID={testID} style={style}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={style}
    >
      {content}
    </Pressable>
  );
}

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

  const version = Constants.expoConfig?.version ?? "0.1.0";

  if (loading) {
    return (
      <ScreenScaffold titleFirst="Set" titleSecond="Settings" testID="settings">
        <LoadingState variant="row-list" testID="settings-loading" />
      </ScreenScaffold>
    );
  }

  if (error) {
    return (
      <ScreenScaffold titleFirst="Set" titleSecond="Settings" testID="settings">
        <ErrorState message={error} onRetry={refresh} testID="settings-error" />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold titleFirst="Set" titleSecond="Settings" scroll={false} testID="settings">
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Text role="small" color="ink" style={{ fontWeight: "600", marginTop: spacing.md }}>
            Account
          </Text>
          <Card variant="paper" compact testID="settings-account">
            <SettingRow
              icon={<CircleUser size={20} color={colors.ink} strokeWidth={1.5} />}
              label={session?.user.email ?? "Signed in"}
              hint={
                accounts.length > 0
                  ? `${accounts.length} connected account${accounts.length === 1 ? "" : "s"}`
                  : "No connected accounts"
              }
              testID="settings-profile"
            />
            {connectionId ? (
              <SettingRow
                icon={<CircleUser size={20} color={colors.ink} strokeWidth={1.5} />}
                label={busy ? "Disconnecting..." : "Disconnect demo accounts"}
                onPress={busy ? undefined : disconnect}
                testID="settings-disconnect"
              />
            ) : null}
          </Card>
          <Text role="small" color="ink" style={{ fontWeight: "600", marginTop: spacing.md }}>
            Privacy
          </Text>
          <Card variant="paper" compact testID="settings-privacy">
            <Link href="/privacy" testID="settings-privacy-link">
              <SettingRow
                icon={<Shield size={20} color={colors.ink} strokeWidth={1.5} />}
                label="What Reconcile can see"
              />
            </Link>
          </Card>
          <Text role="small" color="ink" style={{ fontWeight: "600", marginTop: spacing.md }}>
            Subscription
          </Text>
          <Card variant="paper" compact testID="settings-subscription">
            <SettingRow
              icon={<CreditCard size={20} color={colors.ink} strokeWidth={1.5} />}
              label="Reconcile Pro"
              hint="Coming soon"
              testID="settings-pro"
            />
          </Card>
          <Text role="small" color="ink" style={{ fontWeight: "600", marginTop: spacing.md }}>
            About
          </Text>
          <Card variant="paper" compact testID="settings-about">
            <SettingRow
              icon={<Info size={20} color={colors.ink} strokeWidth={1.5} />}
              label={`Version ${version}`}
              testID="settings-version"
            />
            <Link
              href="https://github.com/onyebuchidaniel60/Reconcile"
              testID="settings-opensource"
            >
              <Text role="body" color="ink">
                Open source
              </Text>
            </Link>
            <Link
              href="https://github.com/onyebuchidaniel60/Reconcile/issues"
              testID="settings-issues"
            >
              <Text role="body" color="ink">
                Report an issue
              </Text>
            </Link>
          </Card>
          <View style={{ marginTop: spacing.md }}>
            <Card variant="coral" compact testID="settings-signout-card">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                onPress={out}
                testID="settings-signout"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: radius.chip,
                }}
              >
                <LogOut size={20} color={colors.ink} strokeWidth={1.5} />
                <Text
                  role="body"
                  color="ink"
                  style={{ fontWeight: "600", marginLeft: spacing.md }}
                >
                  Sign out
                </Text>
              </Pressable>
            </Card>
          </View>
          {accounts.length === 0 && !connectionId ? (
            <EmptyState
              message="No banks connected. Demo data is available from Demo Mode."
              testID="settings-empty"
            />
          ) : null}
        </View>
        <PillNav
          active={null}
          onNavigate={(route) => router.push(PILL_ROUTES[route])}
          testID="settings-pill"
        />
      </View>
    </ScreenScaffold>
  );
}
