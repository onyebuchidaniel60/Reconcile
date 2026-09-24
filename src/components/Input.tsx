import { useState } from "react";
import {
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { body } from "../theme/type";
import { Text } from "./Text";

interface InputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  error?: string | null;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Labeled input per design.md §7: 56px, radius 20, paper fill, line border.
 * Focused state uses an ink 1.5px border; error state a coral border with
 * an ink error line below at small size. The label is always rendered above
 * the field, never placeholder-only.
 */
export function Input({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType,
  placeholder,
  error,
  accessibilityLabel,
  testID,
  style,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;
  return (
    <View style={style} testID={testID}>
      <Text role="small" color="ink">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel ?? label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          height: 56,
          borderRadius: radius.compact,
          backgroundColor: colors.paper,
          borderWidth: focused && !hasError ? 1.5 : 1,
          borderColor: hasError ? colors.coral : focused ? colors.ink : colors.line,
          paddingHorizontal: spacing.lg,
          fontSize: body.fontSize,
          color: colors.ink,
          marginTop: spacing.sm,
        }}
      />
      {hasError ? <Text role="small" color="ink">{error}</Text> : null}
    </View>
  );
}
