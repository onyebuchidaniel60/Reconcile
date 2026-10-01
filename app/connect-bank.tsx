// Connect a real bank — hosts Mono's Connect widget in a WebView.
//
// Phase 11. Reached from the Demo screen's "Connect a real bank" button, which
// is enabled only when EXPO_PUBLIC_FEATURE_MONO is true.
//
// Flow:
//   1. Ask bank-connect-session for a Mono Connect Link (server-side).
//   2. Open it in a WebView. The user picks a bank and logs in.
//   3. Completion arrives by one of two documented channels:
//        a. the widget posts a code  -> bank-exchange-code
//        b. Mono fires the account_connected webhook, which claims the
//           reference we reserved -> poll until the row leaves `pending`
//      Both are attempted; (b) is the authoritative one.
//   4. Run the first sync and land on Home.
//
// The WebView never receives the Mono secret key. The only Mono value on this
// screen is the connect URL, which is a public, single-use link.
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import { X } from "lucide-react-native";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { ScreenScaffold } from "../src/components/ScreenScaffold";
import { Text } from "../src/components/Text";
import {
  createConnectSession,
  exchangeConnectCode,
  syncConnection,
  waitForConnection,
} from "../src/lib/db";
import { MONO_ENABLED } from "../src/lib/flags";
import {
  buildRedirectUrl,
  isRedirectTarget,
  parseWidgetMessage,
} from "../src/lib/monoWidget";
import { colors } from "../src/theme/colors";
import { radius } from "../src/theme/radius";
import { spacing } from "../src/theme/spacing";

type Phase = "idle" | "opening" | "linking" | "finishing" | "done";

export default function ConnectBankScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // The reference belongs to the reserved connection row, so every completion
  // path needs it. Declared before the handlers that close over it.
  const currentReference = useRef<string>("");

  // Guards the completion path: the widget can fire both a message and a
  // navigation to the redirect, and a reconnect can repeat either.
  const finishing = useRef(false);

  const startAndTrack = useCallback(async () => {
    setError(null);
    setPhase("opening");
    try {
      const session = await createConnectSession("mono", buildRedirectUrl());
      if (!session.connect_url) {
        throw new Error("The bank connection could not be started.");
      }
      currentReference.current = session.reference;
      setConnectUrl(session.connect_url);
      setPhase("linking");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the bank connection.");
      setPhase("idle");
    }
  }, []);

  /** Runs at most once, whichever completion channel fires first. */
  const complete = useCallback(
    async (reference: string, code: string | null) => {
      if (finishing.current) return;
      finishing.current = true;
      setPhase("finishing");
      setStatus("Finishing the connection...");

      try {
        if (code) {
          // Channel (a). If Mono's data is not ready yet this returns false,
          // which is fine — channel (b) is still pending.
          await exchangeConnectCode(code).catch(() => false);
        }

        // Channel (b): wait for the account_connected webhook to activate the
        // reference we reserved.
        const connection = await waitForConnection(reference);
        if (!connection) {
          throw new Error(
            "We could not finish connecting that bank. You can try again in a moment.",
          );
        }
        if (connection.status === "reauth_required") {
          throw new Error("Your bank asked you to reconnect. Please try again.");
        }

        setStatus("Pulling in your transactions...");
        await syncConnection(connection.id, "initial");
        setPhase("done");
        router.replace("/home");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not complete the bank connection.");
        setPhase("idle");
        finishing.current = false;
      }
    },
    [router],
  );

  const cancel = useCallback(() => {
    // A close is not an error: dismiss without a message.
    finishing.current = true;
    router.back();
  }, [router]);

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const parsed = parseWidgetMessage(event.nativeEvent.data);
      if (parsed.type === "error") {
        setError(parsed.message);
        setPhase("idle");
        return;
      }
      if (parsed.type === "success") {
        void complete(currentReference.current, parsed.code);
        return;
      }
      if (parsed.type === "closed") {
        void complete(currentReference.current, null);
      }
    },
    [complete],
  );

  const onNavigationStateChange = useCallback(
    (nav: { url: string }) => {
      // The redirect is the completion signal on the channels where the widget
      // does not post a message.
      if (isRedirectTarget(nav.url)) {
        void complete(currentReference.current, null);
      }
    },
    [complete],
  );

  if (!MONO_ENABLED) {
    return (
      <ScreenScaffold
        titleFirst="Connect"
        titleSecond="a bank."
        onBack={() => router.back()}
        testID="connect-bank"
      >
        <Card variant="paper" testID="connect-bank-disabled">
          <Text role="body" color="ink">
            Real bank connections are not available yet.
          </Text>
        </Card>
      </ScreenScaffold>
    );
  }

  const busy = phase === "opening" || phase === "finishing";

  return (
    <ScreenScaffold
      titleFirst="Connect"
      titleSecond="a bank."
      onBack={cancel}
      scroll={false}
      actions={[
        {
          label: "Cancel",
          icon: <X size={22} color={colors.ink} strokeWidth={1.5} />,
          onPress: cancel,
        },
      ]}
      testID="connect-bank"
    >
      {status ? (
        <View style={{ marginBottom: spacing.sm }}>
          <Text role="small" color="ink" style={{ opacity: 0.7 }} testID="connect-bank-status">
            {status}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={{ marginBottom: spacing.sm }}>
          <Card variant="paper" testID="connect-bank-error">
            <Text role="body" color="ink">
              {error}
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <Button
                title="Try again"
                variant="secondary"
                onPress={startAndTrack}
                disabled={busy}
                testID="connect-bank-retry"
              />
            </View>
          </Card>
        </View>
      ) : null}

      <View style={{ flex: 1, minHeight: 420 }}>
        {connectUrl ? (
          // react-native-webview does not support react-native-web (it throws
          // "React Native WebView does not support this platform"), and Mono's
          // Connect Link is an ordinary hosted web page, so web gets a plain
          // iframe. Native gets a real WebView, which additionally gives us
          // postMessage and per-navigation callbacks.
          //
          // Completion does not depend on either: the authoritative channel is
          // the account_connected webhook claiming the reserved reference, which
          // complete() polls on both platforms.
          Platform.OS === "web" ? (
            <iframe
              src={connectUrl}
              title="Connect your bank"
              style={{
                flex: 1,
                borderRadius: radius.card,
                border: "none",
                backgroundColor: colors.paper,
              }}
              allow="clipboard-write"
            />
          ) : (
            <WebView
              source={{ uri: connectUrl }}
              originWhitelist={["https://*", "http://*"]}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              setSupportMultipleWindows={false}
              mixedContentMode="never"
              onMessage={onMessage}
              onNavigationStateChange={onNavigationStateChange}
              style={{ flex: 1, borderRadius: radius.card, backgroundColor: colors.paper }}
              testID="connect-bank-webview"
            />
          )
        ) : (
          <Card variant="paper" testID="connect-bank-cta">
            <Text role="body" color="ink">
              Choose your bank and sign in. Reconcile never sees your bank
              password.
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <Button
                title={busy ? "Opening..." : "Choose a bank"}
                onPress={startAndTrack}
                disabled={busy}
                loading={busy}
                testID="connect-bank-start"
              />
            </View>
          </Card>
        )}
      </View>
    </ScreenScaffold>
  );
}
