// Component barrel (Phases 4–7, Waves 1–8). Screens compose these; nothing else.
export { Avatar, avatarInitialForName, avatarTintForName, type AvatarSize } from "./Avatar";
export { BarChart, validateBarFills, type BarDatum, type BarFill } from "./BarChart";
export { BlockingSpinner } from "./BlockingSpinner";
export { Button, type ButtonVariant } from "./Button";
export { Card, type CardVariant } from "./Card";
export { CategoryCircle } from "./CategoryCircle";
export { ChartAxis, type AxisTick } from "./ChartAxis";
export { ChartLegend, type LegendEntry } from "./ChartLegend";
export { ChartTextEquivalent } from "./ChartTextEquivalent";
export { Chip } from "./Chip";
export { DarkScreenScaffold } from "./DarkScreenScaffold";
export { Divider } from "./Divider";
export { Donut, describeDonutArc } from "./Donut";
export { EmptyState } from "./EmptyState";
export { ErrorState } from "./ErrorState";
export { FormScaffold } from "./FormScaffold";
export { HatchPattern, toPatternId } from "./HatchPattern";
export { IconButton } from "./IconButton";
export { Input } from "./Input";
export { LineChart, type LinePoint } from "./LineChart";
export { LoadingState, type LoadingVariant } from "./LoadingState";
export {
  BudgetOverviewCard,
  ExpensesBarCard,
  HeroSummaryCard,
  InsightCard,
  PositiveMessageCard,
  ReviewHeader,
  SpendTrendCard,
  type DeltaDirection,
} from "./organisms";
export { PairedTitle } from "./PairedTitle";
export { PillBadge, type PillBadgeVariant } from "./PillBadge";
export { PillNav, type PillRoute, type PillSurface } from "./PillNav";
export { ProgressBar, type ProgressBarVariant } from "./ProgressBar";
export { ScreenScaffold, type ScaffoldHeaderAction, type ScaffoldTone } from "./ScreenScaffold";
export { SectionHeader } from "./SectionHeader";
export { Skeleton } from "./Skeleton";
export { Starburst, type StarburstSize, type StarburstVariant } from "./Starburst";
export { Text, type TextRole } from "./Text";
export { TransactionRow, type TransactionDirection, type TransactionSurface } from "./TransactionRow";
