// Design tokens — spacing scale, px (design.md §5).
// No arbitrary values: 4, 8, 12, 16, 24, 32, 48.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type SpacingName = keyof typeof spacing;
