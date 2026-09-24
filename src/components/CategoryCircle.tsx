import { View, type StyleProp, type ViewStyle } from "react-native";
import {
  ArrowLeftRight,
  Bus,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  Receipt,
  ShoppingBag,
  TrendingUp,
  User,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react-native";
import { categoryTints, colors, type CategoryTintName } from "../theme/colors";
import { radius } from "../theme/radius";

const CATEGORY_ICONS: Record<CategoryTintName, LucideIcon> = {
  Food: UtensilsCrossed,
  Transport: Bus,
  Bills: Receipt,
  Shopping: ShoppingBag,
  Entertainment: Clapperboard,
  Health: HeartPulse,
  Personal: User,
  Education: GraduationCap,
  Family: Users,
  Income: TrendingUp,
  "Internal Transfer": ArrowLeftRight,
};

interface CategoryCircleProps {
  category: CategoryTintName;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * 40px circular tinted background with a 20px outline icon centered in ink,
 * per design.md §7. Tint and default icon come from the category; the
 * accessibility label is the category name.
 */
export function CategoryCircle({ category, testID, style }: CategoryCircleProps) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={category}
      testID={testID}
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: radius.compact,
          backgroundColor: categoryTints[category],
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Icon size={20} color={colors.ink} strokeWidth={1.5} />
    </View>
  );
}
