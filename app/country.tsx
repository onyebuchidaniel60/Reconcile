import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

const COUNTRIES = ["Nigeria"];

export default function CountryScreen() {
  const [selected, setSelected] = useState("Nigeria");
  return (
    <View>
      <Text>Country</Text>
      <Text>Choose your country. More countries arrive later.</Text>
      {COUNTRIES.map((c) => (
        <Pressable
          key={c}
          accessibilityRole="button"
          accessibilityLabel={`Select ${c}`}
          onPress={() => setSelected(c)}
        >
          <Text>
            {c}
            {selected === c ? " (selected)" : ""}
          </Text>
        </Pressable>
      ))}
      <Link href="/signup">Continue</Link>
      <Link href="/privacy">Back</Link>
    </View>
  );
}
