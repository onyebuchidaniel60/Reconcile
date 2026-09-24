import { Text } from "./Text";

interface PairedTitleProps {
  first: string;
  second: string;
  testID?: string;
}

/**
 * Editorial paired title: first word light (300), second word heavy (700),
 * per design.md §4. Words arrive as props (not parsed from children) so the
 * weight contrast is always explicit.
 */
export function PairedTitle({ first, second, testID }: PairedTitleProps) {
  return (
    <Text testID={testID}>
      <Text role="titleLight">{first} </Text>
      <Text role="titleHeavy">{second}</Text>
    </Text>
  );
}
