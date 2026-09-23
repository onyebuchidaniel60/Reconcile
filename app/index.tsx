import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useSession } from "../src/lib/session";

export default function IndexScreen() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(session ? "/demo" : "/welcome");
  }, [loading, session, router]);

  return (
    <View>
      <Text>Loading...</Text>
    </View>
  );
}
