import { useState } from "react";
import { Pressable, ScrollView, View, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { Bell, Search } from "lucide-react-native";
import { Avatar } from "../../src/components/Avatar";
import { BarChart } from "../../src/components/BarChart";
import { BlockingSpinner } from "../../src/components/BlockingSpinner";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { CategoryCircle } from "../../src/components/CategoryCircle";
import { ChartAxis } from "../../src/components/ChartAxis";
import { ChartLegend } from "../../src/components/ChartLegend";
import { Chip } from "../../src/components/Chip";
import { DarkScreenScaffold } from "../../src/components/DarkScreenScaffold";
import { Divider } from "../../src/components/Divider";
import { Donut } from "../../src/components/Donut";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";
import { FormScaffold } from "../../src/components/FormScaffold";
import { IconButton } from "../../src/components/IconButton";
import { Input } from "../../src/components/Input";
import { LineChart } from "../../src/components/LineChart";
import { LoadingState } from "../../src/components/LoadingState";
import {
  BudgetOverviewCard,
  ExpensesBarCard,
  HeroSummaryCard,
  InsightCard,
  PositiveMessageCard,
  ReviewHeader,
  SpendTrendCard,
} from "../../src/components/organisms";
import { PairedTitle } from "../../src/components/PairedTitle";
import { PillBadge } from "../../src/components/PillBadge";
import { PillNav, type PillRoute } from "../../src/components/PillNav";
import { ProgressBar } from "../../src/components/ProgressBar";
import { ScreenScaffold } from "../../src/components/ScreenScaffold";
import { SectionHeader } from "../../src/components/SectionHeader";
import { Skeleton } from "../../src/components/Skeleton";
import { Starburst } from "../../src/components/Starburst";
import { Text } from "../../src/components/Text";
import { TransactionRow } from "../../src/components/TransactionRow";
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
  const [pillRoute, setPillRoute] = useState<PillRoute>("home");
  const [previewRoute, setPreviewRoute] = useState<PillRoute>("home");

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

        <View testID="gallery-section-wave4">
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
        </View>
        <Divider />

        <View testID="gallery-section-charts">
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
        </View>
        <Divider />

        <View testID="gallery-section-motion">
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
        <Divider />

        <View testID="gallery-section-wave6">
        <SectionHeader title="Wave 6 — Transaction rows" />
        <TransactionRow
          merchant="Bolt"
          date="Sept 14"
          amount={420000}
          currency="NGN"
          category="Transport"
          direction="expense"
          testID="gallery-row-expense"
        />
        <TransactionRow
          merchant="Salary"
          date="Sept 1"
          amount={25000000}
          currency="NGN"
          category="Income"
          direction="income"
          testID="gallery-row-income"
        />
        <TransactionRow
          merchant="Jumia refund"
          date="Sept 10"
          amount={1550000}
          currency="NGN"
          category="Shopping"
          direction="refund"
          testID="gallery-row-refund"
        />
        <TransactionRow
          merchant="GTB to Kuda"
          date="Sept 12"
          amount={5000000}
          currency="NGN"
          category="Internal Transfer"
          direction="internal_transfer"
          testID="gallery-row-transfer"
        />
        <Card variant="ink">
          <TransactionRow
            merchant="Netflix"
            date="Sept 5"
            amount={650000}
            currency="NGN"
            category="Entertainment"
            direction="expense"
            surface="dark"
            testID="gallery-row-dark"
          />
        </Card>
        <Divider />

        <SectionHeader title="Wave 6 — States" />
        <View style={{ height: 220 }}>
          <EmptyState
            message="No transactions yet. Sync an account to get started."
            testID="gallery-empty"
          />
        </View>
        <EmptyState
          message="Nothing here with a ghost action."
          icon={<Search size={32} color={colors.ink} strokeWidth={1.5} />}
          action={
            <Button title="Browse" variant="ghost" onPress={() => {}} testID="gallery-empty-action" />
          }
          testID="gallery-empty-actioned"
        />
        <View style={{ height: 220 }}>
          <ErrorState
            message="Sync failed. Check your connection and retry."
            onRetry={() => {}}
            testID="gallery-error"
          />
        </View>
        <LoadingState variant="row-list" testID="gallery-loading-rows" />
        <LoadingState variant="card-hero" testID="gallery-loading-hero" />
        <LoadingState variant="chart-card" testID="gallery-loading-chart" />
        <View style={{ height: 160 }}>
          <BlockingSpinner testID="gallery-blocking" />
        </View>
        <Divider />

        <SectionHeader title="Wave 6 — Avatars" />
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <View style={{ margin: spacing.xs }}>
            <Avatar displayName="Adaeze" size={32} testID="gallery-avatar-32" />
          </View>
          <View style={{ margin: spacing.xs }}>
            <Avatar displayName="Adaeze" size={40} testID="gallery-avatar-40" />
          </View>
          <View style={{ margin: spacing.xs }}>
            <Avatar displayName="Chidi" size={48} testID="gallery-avatar-48" />
          </View>
          <View style={{ margin: spacing.xs }}>
            <Avatar displayName="Funke" size={64} testID="gallery-avatar-64" />
          </View>
        </View>
        </View>
        <Divider />

        <View testID="gallery-section-wave7">
        <SectionHeader title="Wave 7 — Scaffolds" />
        <ScreenScaffold
          titleFirst="Home"
          titleSecond="Budget"
          onBack={() => {}}
          actions={[
            {
              label: "Search",
              icon: <Search size={24} color={colors.ink} strokeWidth={1.5} />,
              onPress: () => {},
            },
            {
              label: "Notifications",
              icon: <Bell size={24} color={colors.ink} strokeWidth={1.5} />,
              onPress: () => {},
            },
          ]}
          scroll={false}
          testID="gallery-scaffold"
        >
          <Text role="body">Scaffold content with header and actions.</Text>
        </ScreenScaffold>
        <DarkScreenScaffold
          titleFirst="Review"
          titleSecond="Transactions"
          onBack={() => {}}
          scroll={false}
          testID="gallery-dark-scaffold"
        >
          <Text role="body" color="paper">
            Dark scaffold content on ink.
          </Text>
        </DarkScreenScaffold>
        <FormScaffold
          titleFirst="Welcome"
          titleSecond="Back"
          subtitle="Sign in to continue to your budgets."
          ctaTitle="Continue"
          onCta={() => {}}
          scroll={false}
          testID="gallery-form"
        >
          <Input
            label="Email"
            value={name}
            onChangeText={setName}
            placeholder="you@example.com"
            testID="gallery-form-input"
          />
        </FormScaffold>
        <Divider />

        <SectionHeader title="Wave 7 — Pill nav (tap to toggle)" />
        <PillNav
          active={pillRoute}
          onNavigate={setPillRoute}
          testID="gallery-pill"
        />
        <Card variant="ink">
          <PillNav
            active={pillRoute}
            onNavigate={setPillRoute}
            surface="dark"
            testID="gallery-pill-dark"
          />
        </Card>
        </View>
        <Divider />

        <View testID="gallery-section-wave8">
        <SectionHeader title="Wave 8 — Organisms (demo fixtures)" />
        <Text role="small">Demo fixtures below — not real data.</Text>
        <HeroSummaryCard
          period="September 2026"
          total={281700000}
          income={174700000}
          expenses={107000000}
          currency="NGN"
          onPressPeriod={() => {}}
          testID="gallery-hero"
        />
        <BudgetOverviewCard
          spent={17165000}
          limit={25000000}
          currency="NGN"
          periodStart="Sept 1, 2026"
          periodEnd="Sept 30, 2026"
          progress={17165000 / 25000000}
          testID="gallery-budget-overview"
        />
        <ExpensesBarCard
          bars={[
            { label: "May", value: 9800000, fill: "ink" },
            { label: "Jun", value: 12400000, fill: "hatched" },
            { label: "Jul", value: 8600000, fill: "ink" },
            { label: "Aug", value: 7900000, fill: "ink" },
          ]}
          axisTicks={[
            { value: 0, label: "₦0" },
            { value: 5000000, label: "₦50k" },
            { value: 10000000, label: "₦100k" },
            { value: 15000000, label: "₦150k" },
          ]}
          callout="+₦26,000"
          currency="NGN"
          onPressRange={() => {}}
          testID="gallery-expenses"
        />
        <SpendTrendCard
          spent={41250000}
          limit={50000000}
          currency="NGN"
          points={[
            { x: 1, y: 120 },
            { x: 10, y: 200 },
            { x: 20, y: 290 },
            { x: 30, y: 340 },
          ]}
          projectedFrom={3}
          axisTicks={[
            { value: 1, label: "Sept 1" },
            { value: 15, label: "Sept 15" },
            { value: 30, label: "Sept 30" },
          ]}
          testID="gallery-trend"
        />
        <PositiveMessageCard
          message="Keep spending. You can spend ₦4,200 each day for the rest of the period."
          testID="gallery-positive"
        />
        <InsightCard
          label="This month vs last month"
          primary={14683647}
          secondary={33567435}
          delta={56}
          deltaDirection="down"
          explanation="Food costs fell after the holidays, pulling total spend below last month."
          currency="NGN"
          testID="gallery-insight"
        />
        <Card variant="ink">
          <ReviewHeader
            firstWord="Review"
            secondWord="Transactions"
            starburst
            progress="3 of 12"
            testID="gallery-review-header"
          />
        </Card>
        </View>
        <Divider />

        <View testID="gallery-home-preview">
        <SectionHeader title="Home composition preview (demo)" />
        <Text role="small">Preview of the Phase 8 Home screen — not real data.</Text>
        <DarkScreenScaffold scroll={false} testID="gallery-preview-scaffold">
          <HeroSummaryCard
            period="September 2026"
            total={281700000}
            income={174700000}
            expenses={107000000}
            currency="NGN"
            testID="gallery-preview-hero"
          />
          <BudgetOverviewCard
            spent={17165000}
            limit={25000000}
            currency="NGN"
            periodStart="Sept 1, 2026"
            periodEnd="Sept 30, 2026"
            progress={17165000 / 25000000}
            testID="gallery-preview-budget"
          />
          <TransactionRow
            merchant="Bolt"
            date="Sept 14"
            amount={420000}
            currency="NGN"
            category="Transport"
            direction="expense"
            surface="dark"
            testID="gallery-preview-row-1"
          />
          <TransactionRow
            merchant="Shoprite"
            date="Sept 13"
            amount={850000}
            currency="NGN"
            category="Food"
            direction="expense"
            surface="dark"
            testID="gallery-preview-row-2"
          />
          <TransactionRow
            merchant="Netflix"
            date="Sept 5"
            amount={650000}
            currency="NGN"
            category="Entertainment"
            direction="expense"
            surface="dark"
            testID="gallery-preview-row-3"
          />
          <PillNav
            active={previewRoute}
            onNavigate={setPreviewRoute}
            surface="dark"
            testID="gallery-preview-pill"
          />
        </DarkScreenScaffold>
        </View>
      </View>
    </ScrollView>
  );
}
