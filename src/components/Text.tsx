import { Text as RNText, type StyleProp, type TextStyle } from "react-native";
import { colors, type ColorName } from "../theme/colors";
import { fontFamily, type TypeRole } from "../theme/type";
import * as roles from "../theme/type";

export type TextRole =
  | "displayXl"
  | "display"
  | "titleLight"
  | "titleHeavy"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "small"
  | "mono";

const ROLE_MAP: Record<TextRole, TypeRole> = {
  displayXl: roles.displayXl,
  display: roles.display,
  titleLight: roles.titleLight,
  titleHeavy: roles.titleHeavy,
  h1: roles.h1,
  h2: roles.h2,
  h3: roles.h3,
  body: roles.body,
  small: roles.small,
  mono: roles.mono,
};

interface TextProps {
  role?: TextRole;
  color?: ColorName;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  numberOfLines?: number;
}

/** Single typographic primitive. Default role is `body`. */
export function Text({
  role = "body",
  color = "ink",
  style,
  children,
  testID,
  accessibilityLabel,
  numberOfLines,
}: TextProps) {
  const roleStyle = ROLE_MAP[role];
  return (
    <RNText
      style={[
        {
          fontFamily,
          fontSize: roleStyle.fontSize,
          lineHeight: roleStyle.lineHeight,
          fontWeight: roleStyle.fontWeight,
          letterSpacing: roleStyle.letterSpacing,
          color: colors[color],
        },
        style,
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      numberOfLines={numberOfLines}
    >
      {children}
    </RNText>
  );
}
