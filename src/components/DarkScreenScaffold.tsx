import type { StyleProp, ViewStyle } from "react-native";
import { ScreenScaffold, type ScaffoldHeaderAction } from "./ScreenScaffold";

interface DarkScreenScaffoldProps {
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
 * Dark screen shell for Home and Review Transactions only
 * (design.md §11 / §14): ink background with paper text defaults.
 * Same header, scroll, and pill-nav padding contract as ScreenScaffold.
 */
export function DarkScreenScaffold({
  titleFirst,
  titleSecond,
  onBack,
  backLabel,
  backIcon,
  actions,
  scroll,
  children,
  testID,
  style,
}: DarkScreenScaffoldProps) {
  return (
    <ScreenScaffold
      tone="dark"
      titleFirst={titleFirst}
      titleSecond={titleSecond}
      onBack={onBack}
      backLabel={backLabel}
      backIcon={backIcon}
      actions={actions}
      scroll={scroll}
      testID={testID}
      style={style}
    >
      {children}
    </ScreenScaffold>
  );
}
