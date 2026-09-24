import { useState } from "react";
import { Pressable, ScrollView, View, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { BarChart } from "../../src/components/BarChart";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { CategoryCircle } from "../../src/components/CategoryCircle";
import { ChartAxis } from "../../src/components/ChartAxis";
import { ChartLegend } from "../../src/components/ChartLegend";
import { Chip } from "../../src/components/Chip";
import { Divider } from "../../src/components/Divider";
import { Donut } from "../../src/components/Donut";
import { IconButton } from "../../src/components/IconButton";
import { Input } from "../../src/components/Input";
import { LineChart } from "../../src/components/LineChart";
import { PairedTitle } from "../../src/components/PairedTitle";
import { PillBadge } from "../../src/components/PillBadge";
import { ProgressBar } from "../../src/components/ProgressBar";
import { SectionHeader } from "../../src/components/SectionHeader";
import { Skeleton } from "../../src/components/Skeleton";
import { Starburst } from "../../src/components/Starburst";
import { Text } from "../../src/components/Text";
import { useCardEntrance } from "../../src/lib/motion/useCardEntrance";
import { useConfirmPulse } from "../../src/lib/motion/useConfirmPulse";
import { usePressScale } from "../../src/lib/motion/usePressScale";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";

// Dev-only primitive catalog. Not linked from any user-facing screen.
// Visible only when the app is not production, or when the
// EXPO_PUBLIC_ENABLE_DEV_ROUTES flag is set. Report the flag name to the
// operator: EXPO_PUBLIC_ENABLE_DEV_ROUTES.
const DEV_ROUTES_ENABLED =
  process.env.EXPO_PUBLIC_APP_ENV !== "production" ||
  process.env.EXPO_PUBLIC_ENABLE_DEV_ROUTES === "true";

const BAR_FIXTURE = [
  { label: "Jun", value: 12000, fill: "ink" },
  { label: "Jul", value: 18500, fill: "hatched" },
  { label: "Aug", value: 8000, fill: "ink" },
  { label: "Sep", value: 6500, fill: "ink" },
] as const;

const LINE_FIXTURE = [
  { x: 1, y: 300 },
  { x: 10, y: 260 },
  { x: 20, y: 310 },
  { x: 30, y: 280 },
];

function MotionDemos({ reduceMotion }: { reduceMotion: boolean }) {
  const press = usePressScale(false, { forceReduceMotion: reduceMotion });
  const entrance0 = useCardEntrance(0, { forceReduceMotion: reduceMotion });
  const entrance1 = useCardEntrance(1, { forceReduceMotion: reduceMotion });
  const entrance2 = useCardEntrance(2, { forceReduceMotion: reduceMotion });
  const confirmPulse = useConfirmPulse({ forceReduceMotion: reduceMotion });
  const [replayKey, setReplayKey] = useState(0);
  const Pressable = press.Pressable;
  return (
    <View>
      <Text role="body">
        Press scale, card entrance (staggered), confirm pulse, chart reveal.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Press scale demo"
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        testID="gallery-motion-press"
        style={press.animatedStyle}
      >
        <Text role="small">Press me</Text>
      </Pressable>
      <AnimatedEntrance style={entrance0} testID="gallery-motion-card-0" />
      <AnimatedEntrance style={entrance1} testID="gallery-motion-card-1" />
      <AnimatedEntrance style={entrance2} testID="gallery-motion-card-2" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Confirm pulse demo"
        onPress={confirmPulse.pulse}
        testID="gallery-motion-pulse"
        style={confirmPulse.animatedStyle}
      >
        <Text role="small">Pulse me</Text>
      </Pressable>
      <View key={replayKey}>
        <Donut
          total={100000}
          primary={0.6}
          currency="NGN"
          labels={{ primary: "Income", secondary: "Expenses" }}
          testID="gallery-motion-donut"
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Replay chart reveal"
        onPress={() => setReplayKey((key) => key + 1)}
        testID="gallery-motion-replay"
      >
        <Text role="small">Replay reveal</Text>
      </Pressable>
    </View>
  );
}

function AnimatedEntrance({
  style,
  testID,
}: {
  style: AnimatedStyle<ViewStyle>;
  testID: string;
}) {
  return (
    <Animated.View testID={testID} style={[{ height: 24 }, style]}>
      <Text role="small">Entrance card</Text>
    </Animated.View>
  );
}

export default function PrimitivesGallery() {
  const [chipOn, setChipOn] = useState(false);
  const [name, setName] = useState("Ada");
  const [reduceMotion, setReduceMotion] = useState(false);

  if (!DEV_ROUTES_ENABLED) {
    return (
      <View>
        <Text>Not available.</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      <View style={{ padding: spacing.lg }}>
        <PairedTitle first="Primitive" second="Gallery" />
        <Divider />

        <SectionHeader title="Text roles" />
        <Text role="displayXl">Display XL</Text>
        <Text role="display">Display</Text>
        <Text role="h1">Heading 1</Text>
        <Text role="h2">Heading 2</Text>
        <Text role="h3">Heading 3</Text>
        <Text role="body">Body text for paragraphs and list content.</Text>
        <Text role="small">Small label text.</Text>
        <Text role="mono">₦1,234.00 tabular</Text>
        <Divider />

        <SectionHeader title="Buttons" />
        <Button title="Primary" onPress={() => {}} testID="gallery-btn-primary" />
        <Button
          title="Secondary"
          variant="secondary"
          onPress={() => {}}
          testID="gallery-btn-secondary"
        />
        <Button title="Ghost" variant="ghost" onPress={() => {}} testID="gallery-btn-ghost" />
        <Button title="Disabled" onPress={() => {}} disabled testID="gallery-btn-disabled" />
        <Button
          title="Trailing icon"
          onPress={() => {}}
          trailingIcon={<Text role="small">→</Text>}
          testID="gallery-btn-icon"
        />
        <Divider />

        <SectionHeader title="Icon buttons" />
        <IconButton accessibilityLabel="Back" onPress={() => {}} testID="gallery-icon-light">
          <Text role="body">←</Text>
        </IconButton>
        <Card variant="ink">
          <IconButton
            accessibilityLabel="Menu on dark"
            onPress={() => {}}
            tone="dark"
            testID="gallery-icon-dark"
          >
            <Text role="body" color="paper">
              ☰
            </Text>
          </IconButton>
        </Card>
        <Divider />

        <SectionHeader title="Inputs" />
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Adaeze"
          testID="gallery-input"
        />
        <Input
          label="Amount with error"
          value=""
          onChangeText={() => {}}
          error="Enter a valid non-negative amount."
          testID="gallery-input-error"
        />
        <Divider />

        <SectionHeader title="Chips" />
        <Chip label="All" testID="gallery-chip" />
        <Chip
          label="Toggle me"
          selected={chipOn}
          onPress={() => setChipOn((v) => !v)}
          testID="gallery-chip-toggle"
        />
        <Card variant="ink">
          <Chip label="Dark chip" tone="dark" testID="gallery-chip-dark" />
        </Card>
        <Divider />

        <SectionHeader title="Cards" actionLabel="See all" onAction={() => {}} />
        <Card variant="paper" testID="gallery-card-paper">
          <Text role="body">Paper card</Text>
        </Card>
        <Card variant="yellow" testID="gallery-card-yellow">
          <Text role="body">Yellow card</Text>
        </Card>
        <Card variant="ink" testID="gallery-card-ink">
          <Text role="body" color="paper">
            Ink card
          </Text>
        </Card>
        <Card variant="mist" testID="gallery-card-mist">
          <Text role="body">Mist card</Text>
        </Card>
        <Card variant="mint" testID="gallery-card-mint">
          <Text role="body">Mint card</Text>
        </Card>
        <Card variant="coral" testID="gallery-card-coral">
          <Text role="body">Coral card</Text>
        </Card>
        <Card variant="paper" compact testID="gallery-card-compact">
          <Text role="body">Compact card</Text>
        </Card>
        <Divider />

        <SectionHeader title="Skeleton" />
        <Skeleton testID="gallery-skeleton" />
        <Skeleton height={64} radiusName="compact" testID="gallery-skeleton-tall" />
        <Divider />

        <SectionHeader title="Category circles" />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {(
            [
              "Food",
              "Transport",
              "Bills",
              "Shopping",
              "Entertainment",
              "Health",
              "Personal",
              "Education",
              "Family",
              "Income",
              "Internal Transfer",
            ] as const
          ).map((category) => (
            <View key={category} style={{ margin: spacing.xs }}>
              <CategoryCircle category={category} />
            </View>
          ))}
        </View>
        <Divider />

        <SectionHeader title="Starbursts" />
        <Starburst variant="signal-yellow" testID="gallery-starburst-yellow" />
        <Starburst variant="alert-red" text="-₦150" testID="gallery-starburst-red" />
        <Starburst variant="paper" testID="gallery-starburst-paper" />
        <Starburst variant="signal-yellow" size={32} testID="gallery-starburst-small" />
        <Starburst variant="signal-yellow" size={64} animateIn testID="gallery-starburst-big" />
        <Divider />

        <SectionHeader title="Progress bars" />
        <ProgressBar value={0.5} testID="gallery-progress" />
        <ProgressBar value={0.5} label="50%" testID="gallery-progress-label" />
        <ProgressBar value={0.75} variant="ink" testID="gallery-progress-ink" />
        <Card variant="ink">
          <ProgressBar value={0.5} variant="ink" testID="gallery-progress-inkcard" />
        </Card>
        <Divider />

        <SectionHeader title="Pill badges" />
        <PillBadge label="Today" variant="dark" testID="gallery-badge-dark" />
        <PillBadge label="50%" variant="light" testID="gallery-badge-light" />
        <Divider />

        <SectionHeader title="Charts" />
        <Donut
          total={174700}
          primary={0.62}
          currency="NGN"
          labels={{ primary: "Income", secondary: "Expenses" }}
          testID="gallery-donut"
        />
        <BarChart
          bars={[...BAR_FIXTURE]}
          axisTicks={[
            { value: 0, label: "0" },
            { value: 10000, label: "10k" },
            { value: 20000, label: "20k" },
          ]}
          calloutText="-₦150"
          testID="gallery-barchart"
        />
        <LineChart
          points={[...LINE_FIXTURE]}
          projectedFrom={2}
          axisTicks={[
            { value: 1, label: "W1" },
            { value: 30, label: "W4" },
          ]}
          cornerStarburst
          testID="gallery-linechart"
        />
        <ChartAxis
          orientation="x"
          ticks={[
            { value: 1, label: "Jun" },
            { value: 2, label: "Jul" },
            { value: 3, label: "Aug" },
            { value: 4, label: "Sep" },
          ]}
          length={280}
          testID="gallery-axis"
        />
        <ChartLegend
          entries={[
            { color: colors.signalYellow, label: "Income", value: "₦1,070" },
            { color: colors.ink, label: "Expenses", value: "₦308" },
          ]}
          testID="gallery-legend"
        />
        <Divider />

        <SectionHeader title="Motion (dev only)" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle reduced motion"
          onPress={() => setReduceMotion((v) => !v)}
          testID="gallery-reduce-toggle"
        >
          <Text role="small">
            Reduced motion: {reduceMotion ? "on" : "off"}
          </Text>
        </Pressable>
        <MotionDemos reduceMotion={reduceMotion} />
      </View>
    </ScrollView>
  );
}
