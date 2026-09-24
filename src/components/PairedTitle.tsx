import { type ColorName } from "../theme/colors";
import { Text } from "./Text";

interface PairedTitleProps {
  first: string;
  second: string;
  color?: ColorName;
  testID?: string;
}

/**
 * Editorial paired title: first word light (300), second word heavy (700),
 * per design.md §4. Words arrive as props (not parsed from children) so the
 * weight contrast is always explicit. Color defaults to ink; dark surfaces
 * pass paper.
 */
export function PairedTitle({ first, second, color = "ink", testID }: PairedTitleProps) {
  return (
    <Text testID={testID} color={color}>
      <Text role="titleLight" color={color}>{first} </Text>
      <Text role="titleHeavy" color={color}>{second}</Text>
    </Text>
  );
}
