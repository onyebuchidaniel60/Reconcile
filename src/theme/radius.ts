// Design tokens — radius scale, px (design.md §5).

export const radius = {
  chip: 12,
  compact: 20,
  card: 28,
  pill: 999,
} as const;

export type RadiusName = keyof typeof radius;
