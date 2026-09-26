import { Stack, useRouter } from "expo-router";
import { View } from "react-native";
import { Button } from "../src/components/Button";
import { EmptyState } from "../src/components/EmptyState";
import { ScreenScaffold } from "../src/components/ScreenScaffold";

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <ScreenScaffold testID="not-found">
      <Stack.Screen options={{ title: "Not found" }} />
      <View>
        <EmptyState
          message="This page doesn't exist."
          action={
            <Button
              title="Back home"
              variant="secondary"
              onPress={() => router.push("/home")}
              testID="not-found-home"
            />
          }
          testID="not-found-empty"
        />
      </View>
    </ScreenScaffold>
  );
}
