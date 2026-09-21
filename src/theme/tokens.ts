// Base theme tokens only (ARCHITECTURE.md §13). No components in Phase 1.
// Full design-system primitives (Button, Card, PillNav, charts, motion) land
// in Phase 2.

export const colors = {
  ink: "#070707",
  paper: "#F6F6F1",
  signalYellow: "#F2F50A",
  softCoral: "#FFB0A8",
  mint: "#79DE72",
  lavender: "#A49BFF",
  line: "#DADAD2",
} as const;

export type ColorName = keyof typeof colors;

// Card radii stay within the 20–28px product direction.
export const radii = {
  card: 20,
  cardLarge: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  heroSize: 44,
  titleSize: 24,
  bodySize: 16,
  captionSize: 12,
} as const;

export const theme = {
  colors,
  radii,
  spacing,
  typography,
} as const;

export type Theme = typeof theme;
