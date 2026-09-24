import { Text } from "./Text";

interface ChartTextEquivalentProps {
  description: string;
  testID?: string;
}

/**
 * Visually hidden text equivalent for a chart: values, units, and a short
 * summary. Rendered as a real (screen-reader reachable) element; every chart
 * also wires the same string into its own accessibilityLabel.
 */
export function ChartTextEquivalent({ description, testID }: ChartTextEquivalentProps) {
  return (
    <Text
      role="small"
      testID={testID}
      accessibilityLabel={description}
      style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
    >
      {description}
    </Text>
  );
}
