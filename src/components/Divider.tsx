import { View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";

interface DividerProps {
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** 1px line horizontal rule for quiet separation on light surfaces. */
export function Divider({ testID, style }: DividerProps) {
  return (
    <View
      testID={testID}
      style={[{ height: 1, backgroundColor: colors.line }, style]}
    />
  );
}
