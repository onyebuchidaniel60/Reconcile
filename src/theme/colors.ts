// Design tokens — colors (design.md §3). Single source of truth for color.
// No hex value may appear anywhere else in app/ or src/.

export const colors = {
  // Core
  ink: "#0A0A0A",
  paper: "#F6F6F1",
  signalYellow: "#EAFF00",
  line: "#DADAD2",
  // Secondary surfaces
  mist: "#CDE5EC",
  mint: "#D5F2C4",
  coral: "#FFB0A8",
  lavender: "#A49BFF",
  // Emphasis (starburst badges and over-budget indicators only, never text)
  alertRed: "#EF3D28",
  // Derived surfaces for pressables (design.md §7 icon buttons, §4 chips)
  iconButton: "#E8E8E3",
  inkOverlay10: "rgba(10, 10, 10, 0.1)",
  paperOverlay12: "rgba(246, 246, 241, 0.12)",
} as const;

export type ColorName = keyof typeof colors;

// Category tints for transaction rows (design.md §3). Bills uses alertRed
// applied at 15% opacity over Ink (or a muted red) by the future
// CategoryCircle component; Internal Transfer is a paper-on-ink neutral
// pairing whose token here is paper.
export const categoryTints = {
  Food: colors.coral,
  Transport: colors.lavender,
  Bills: colors.alertRed,
  Shopping: colors.signalYellow,
  Entertainment: colors.mist,
  Health: colors.mint,
  Personal: colors.lavender,
  Education: colors.mist,
  Family: colors.coral,
  Income: colors.mint,
  "Internal Transfer": colors.paper,
} as const;

export type CategoryTintName = keyof typeof categoryTints;
