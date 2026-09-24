import { View, type StyleProp, type ViewStyle } from "react-native";
import { spacing } from "../theme/spacing";
import { Skeleton } from "./Skeleton";

export type LoadingVariant = "row-list" | "card-hero" | "chart-card";

interface LoadingStateProps {
  variant?: LoadingVariant;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

function RowListSkeleton() {
  return (
    <View>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={{ flexDirection: "row", alignItems: "center", minHeight: 64 }}
        >
          <Skeleton width={40} height={40} radiusName="pill" />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Skeleton width="60%" height={16} radiusName="chip" />
            <Skeleton width="40%" height={12} radiusName="chip" />
          </View>
          <Skeleton width={72} height={16} radiusName="chip" />
        </View>
      ))}
    </View>
  );
}

function CardHeroSkeleton() {
  return (
    <View>
      <Skeleton width="45%" height={16} radiusName="chip" />
      <Skeleton width="80%" height={48} radiusName="card" />
      <View style={{ flexDirection: "row" }}>
        <View style={{ flex: 1 }}>
          <Skeleton width="70%" height={14} radiusName="chip" />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width="70%" height={14} radiusName="chip" />
        </View>
      </View>
    </View>
  );
}

function ChartCardSkeleton() {
  return (
    <View>
      <Skeleton width="55%" height={16} radiusName="chip" />
      <Skeleton width="100%" height={160} radiusName="card" />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Skeleton width={48} height={12} radiusName="chip" />
        <Skeleton width={48} height={12} radiusName="chip" />
        <Skeleton width={48} height={12} radiusName="chip" />
      </View>
    </View>
  );
}

/**
 * Loading state per design.md §7: a composition of Skeleton blocks matching
 * the shape of the content being replaced. No spinner on content cards —
 * full-screen blocking loads use BlockingSpinner instead.
 */
export function LoadingState({
  variant = "row-list",
  accessibilityLabel = "Loading",
  testID,
  style,
}: LoadingStateProps) {
  return (
    <View accessibilityLabel={accessibilityLabel} testID={testID} style={style}>
      {variant === "row-list" ? <RowListSkeleton /> : null}
      {variant === "card-hero" ? <CardHeroSkeleton /> : null}
      {variant === "chart-card" ? <ChartCardSkeleton /> : null}
    </View>
  );
}
