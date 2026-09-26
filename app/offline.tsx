import { useRouter } from "expo-router";
import { ErrorState } from "../src/components/ErrorState";
import { ScreenScaffold } from "../src/components/ScreenScaffold";

/**
 * Offline fallback route. Retry returns to the previous screen; per-screen
 * ErrorStates cover query failures everywhere else.
 */
export default function OfflineScreen() {
  const router = useRouter();
  return (
    <ScreenScaffold testID="offline">
      <ErrorState
        message="You're offline. Check your connection and try again."
        onRetry={() => router.back()}
        retryLabel="Retry"
        testID="offline-error"
      />
    </ScreenScaffold>
  );
}
