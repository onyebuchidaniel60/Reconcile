import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { IconButton } from "./IconButton";
import { PairedTitle } from "./PairedTitle";

export type ScaffoldTone = "light" | "dark";

export interface ScaffoldHeaderAction {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
  testID?: string;
}

interface ScreenScaffoldProps {
  tone?: ScaffoldTone;
  titleFirst?: string;
  titleSecond?: string;
  onBack?: () => void;
  backLabel?: string;
  backIcon?: React.ReactNode;
  /** Up to two right-side actions. Only the first two render. */
  actions?: ScaffoldHeaderAction[];
  /** Scrollable content area by default; opt out for self-scrolling screens. */
  scroll?: boolean;
  children: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * App screen shell: safe area top + bottom, paper background (ink for
 * dark), optional header (paired title, left back IconButton, up to two
 * right IconButtons), scrollable content by default. Bottom padding
 * reserves room for the floating pill nav (48px + safe area).
 */
export function ScreenScaffold({
  tone = "light",
  titleFirst,
  titleSecond,
  onBack,
  backLabel = "Back",
  backIcon,
  actions = [],
  scroll = true,
  children,
  testID,
  style,
}: ScreenScaffoldProps) {
  const dark = tone === "dark";
  const iconTone = dark ? "dark" : "light";
  const iconColor = dark ? colors.paper : colors.ink;
  const hasTitle = titleFirst !== undefined || titleSecond !== undefined;
  const hasHeader = hasTitle || onBack !== undefined || actions.length > 0;
  const visibleActions = actions.slice(0, 2);

  const header = hasHeader ? (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
      }}
    >
      {onBack ? (
        <IconButton
          accessibilityLabel={backLabel}
          onPress={onBack}
          tone={iconTone}
          testID={testID ? `${testID}-back` : undefined}
        >
          {backIcon ?? <ChevronLeft size={24} color={iconColor} strokeWidth={1.5} />}
        </IconButton>
      ) : null}
      {hasTitle ? (
        <View style={{ flex: 1, marginLeft: onBack ? spacing.md : undefined }}>
          <PairedTitle
            first={titleFirst ?? ""}
            second={titleSecond ?? ""}
            color={dark ? "paper" : "ink"}
          />
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {visibleActions.map((action) => (
        <View key={action.label} style={{ marginLeft: spacing.sm }}>
          <IconButton
            accessibilityLabel={action.label}
            onPress={action.onPress}
            tone={iconTone}
            testID={action.testID}
          >
            {action.icon}
          </IconButton>
        </View>
      ))}
    </View>
  ) : null;

  const contentStyle = {
    paddingHorizontal: spacing.xl,
    // Reserve the floating pill nav footprint: 48px plus the safe area,
    // which SafeAreaView already applies at the bottom edge.
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      testID={testID}
      style={[
        { flex: 1, backgroundColor: dark ? colors.ink : colors.paper },
        style,
      ]}
    >
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={contentStyle}>{children}</ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
}
