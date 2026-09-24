import { Link } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { askQuestion } from "../src/lib/db";

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
    <View>
      <Text>Ask Reconcile (Demo)</Text>
      <Text>Demo data is synthetic. Answers are deterministic, never AI guesses.</Text>
      {messages.length === 0 ? (
        <View>
          <Text>No questions yet. Try a suggestion below.</Text>
          {SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={`Ask: ${s}`}
              onPress={() => send(s)}
              disabled={busy}
            >
              <Text>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) =>
            item.role === "user" ? (
              <Text>You: {item.text}</Text>
            ) : (
              <View>
                <Text>{item.text}</Text>
                {item.basis ? <Text>{item.basis}</Text> : null}
              </View>
            )
          }
        />
      )}
      {busy ? <Text>Thinking...</Text> : null}
      {error ? (
        <View>
          <Text>{error}</Text>
          {lastQuestion ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry question"
              onPress={() => send(lastQuestion)}
            >
              <Text>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Text>Ask a question</Text>
      <TextInput
        value={input}
        onChangeText={setInput}
        accessibilityLabel="Question"
        onSubmitEditing={() => send(input)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send question"
        onPress={() => send(input)}
        disabled={busy}
      >
        <Text>Send</Text>
      </Pressable>
      <Link href="/insights">Insights</Link>
      <Link href="/home">Back home</Link>
    </View>
  );
}
