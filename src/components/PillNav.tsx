import { Platform, Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Activity, House, Lightbulb, Wallet, type LucideIcon } from "lucide-react-native";
import { select } from "../lib/haptics";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";

export type PillRoute = "home" | "activity" | "budget" | "insights";

export type PillSurface = "light" | "dark";

/**
 * Rendered height of the pill: the 44px minimum touch target (design.md §7)
 * plus `spacing.sm` of vertical padding above and below. Exported so
 * scrollable screens can reserve the pill's footprint with a real value
 * instead of a hand-tuned guess (Phase 10A.5, Fix 4).
 */
export const PILL_NAV_HEIGHT = 44 + spacing.sm * 2;

/**
 * Bottom padding a scrollable screen needs so its last row clears the
 * floating pill: the device safe-area inset, plus the pill's own height,
 * plus one `spacing.lg` breathing gap. Screens call this with
 * `useSafeAreaInsets().bottom` so the clearance is measured rather than
 * guessed (Phase 10A.5, Fix 4).
 */
export function pillNavClearance(safeAreaBottom: number): number {
  return safeAreaBottom + PILL_NAV_HEIGHT + spacing.lg;
}

interface PillItem {
  route: PillRoute;
  label: string;
  Icon: LucideIcon;
}

const ITEMS: PillItem[] = [
  { route: "home", label: "Home", Icon: House },
  { route: "activity", label: "Activity", Icon: Activity },
  { route: "budget", label: "Budget", Icon: Wallet },
  { route: "insights", label: "Insights", Icon: Lightbulb },
];

interface PillNavProps {
  /** Active route, or null for screens with no pill item (e.g. Settings). */
  active: PillRoute | null;
  onNavigate: (route: PillRoute) => void;
  surface?: PillSurface;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Floating pill navigation per design.md §7: 16px horizontal inset, paper
 * pill on light screens (ink on dark), 4 icon-only items. The active item
 * carries a signal-yellow circular indicator with an ink icon; unselected
 * items are outline icons at 70%. Each item is a 44×44 press target with a
 * button role and label. Selection changes fire a selection haptic. The
 * container height is `PILL_NAV_HEIGHT`, the value screens reserve.
 */
export function PillNav({ active, onNavigate, surface = "light", testID, style }: PillNavProps) {
  const dark = surface === "dark";
  const idleColor = dark ? colors.paper : colors.ink;

  const handlePress = (route: PillRoute): void => {
    void select();
    onNavigate(route);
  };

  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          marginHorizontal: spacing.lg,
          minHeight: PILL_NAV_HEIGHT,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          backgroundColor: dark ? colors.ink : colors.paper,
          ...Platform.select({
            // react-native-web deprecated shadow* props; boxShadow is the
            // web equivalent of the soft native shadow below.
            web: { boxShadow: "0 2px 12px rgba(10, 10, 10, 0.12)" },
            default: {
              shadowColor: colors.ink,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 3,
            },
          }),
        },
        style,
      ]}
    >
      {ITEMS.map(({ route, label, Icon }) => {
        const selected = route === active;
        return (
          <Pressable
            key={route}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => handlePress(route)}
            testID={testID ? `${testID}-${route}` : `pill-nav-${route}`}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.signalYellow : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              size={24}
              color={selected ? colors.ink : idleColor}
              strokeWidth={1.5}
              opacity={selected ? 1 : 0.7}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
