import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { Send } from "lucide-react-native";
import { askQuestion } from "../src/lib/db";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { Chip } from "../src/components/Chip";
import { ErrorState } from "../src/components/ErrorState";
import { IconButton } from "../src/components/IconButton";
import { Input } from "../src/components/Input";
import { ScreenScaffold } from "../src/components/ScreenScaffold";
import { Text } from "../src/components/Text";
import { colors } from "../src/theme/colors";
import { radius } from "../src/theme/radius";
import { spacing } from "../src/theme/spacing";

interface Message {
  id: string;
  role: "user" | "answer";
  text: string;
  basis?: string;
}

const SUGGESTIONS = [
  "How much did I spend this month?",
  "How much did I spend on food?",
  "Did I spend more than last month?",
  "Am I on budget?",
];

let nextId = 1;

export default function AskScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  const send = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    setError(null);
    setLastQuestion(trimmed);
    setMessages((prev) => [...prev, { id: `u-${nextId++}`, role: "user", text: trimmed }]);
    setInput("");
    setBusy(true);
    try {
      const result = await askQuestion(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: `a-${nextId++}`, role: "answer", text: result.answer, basis: result.basis },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not answer that question.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScaffold
      titleFirst="Ask"
      titleSecond="Reconcile"
      onBack={() => router.back()}
      backLabel="Back"
      scroll={false}
      testID="ask"
    >
      <View style={{ flex: 1 }}>
        {messages.length === 0 ? (
          <View>
            <Text role="body" color="ink" testID="ask-intro">
              Ask about your spending. Answers come from your real transactions.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: spacing.sm }}>
              {SUGGESTIONS.map((s) => (
                <View key={s} style={{ margin: spacing.xs }}>
                  <Chip
                    label={s}
                    accessibilityLabel={`Ask: ${s}`}
                    onPress={() => send(s)}
                    testID={`ask-suggest-${s.slice(0, 12)}`}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            testID="ask-list"
            renderItem={({ item }) =>
              item.role === "user" ? (
                <View style={{ alignItems: "flex-end", marginTop: spacing.sm }}>
                  <View
                    style={{
                      backgroundColor: colors.ink,
                      borderRadius: radius.chip,
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      maxWidth: "85%",
                    }}
                    testID={`ask-user-${item.id}`}
                  >
                    <Text role="body" color="paper">
                      {item.text}
                    </Text>
                  </View>
                </View>
              ) : (
                <Card variant="paper" testID={`ask-answer-${item.id}`}>
                  <Text role="body" color="ink">
                    {item.text}
                  </Text>
                  {item.basis ? (
                    <Text role="small" color="ink" style={{ opacity: 0.6, marginTop: spacing.xs }}>
                      {item.basis}
                    </Text>
                  ) : null}
                </Card>
              )
            }
          />
        )}
        {busy ? (
          <Text role="body" color="ink" style={{ marginTop: spacing.sm }} testID="ask-thinking">
            Thinking...
          </Text>
        ) : null}
        {error ? (
          <ErrorState
            message={error}
            onRetry={() => lastQuestion && send(lastQuestion)}
            retryLabel="Retry"
            testID="ask-error"
          />
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Input
              label="Question"
              value={input}
              onChangeText={setInput}
              placeholder="How much did I spend on food?"
              testID="ask-input"
            />
          </View>
          <View style={{ marginLeft: spacing.sm }}>
            <IconButton
              accessibilityLabel="Send question"
              onPress={() => send(input)}
              testID="ask-send"
            >
              <Send size={24} color={colors.ink} strokeWidth={1.5} />
            </IconButton>
          </View>
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <Button
            title="Back home"
            variant="ghost"
            onPress={() => router.push("/home")}
            testID="ask-home"
          />
        </View>
      </View>
    </ScreenScaffold>
  );
}
