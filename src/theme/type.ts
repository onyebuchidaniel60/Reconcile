// Design tokens — typography (design.md §4). Geometric sans (Inter)
// everywhere; no serifs, no display fonts, no mixed families.

export const fontFamily = "Inter";

export type FontWeight = "300" | "400" | "500" | "600" | "700" | "800";

export interface TypeRole {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
  letterSpacing: number;
}

// Hero display (56–72, line height 1.0).
export const displayXl: TypeRole = {
  fontSize: 64,
  lineHeight: 64,
  fontWeight: "800",
  letterSpacing: 0,
};

// Display (40–48, line height 1.05).
export const display: TypeRole = {
  fontSize: 44,
  lineHeight: 46,
  fontWeight: "800",
  letterSpacing: 0,
};

// Paired title (36–44, line height 1.1). Titles always pair a light word
// with a heavy word (e.g. "Home **Budget**"), so the title role is exported
// as a light/heavy pair rather than a single weight. This is the documented
// approach: titleLight + titleHeavy.
export const titleLight: TypeRole = {
  fontSize: 40,
  lineHeight: 44,
  fontWeight: "300",
  letterSpacing: 0,
};

export const titleHeavy: TypeRole = {
  fontSize: 40,
  lineHeight: 44,
  fontWeight: "700",
  letterSpacing: 0,
};

// Heading 1 (28–32, line height 1.15).
export const h1: TypeRole = {
  fontSize: 30,
  lineHeight: 35,
  fontWeight: "700",
  letterSpacing: 0,
};

// Heading 2 (22–24, line height 1.2).
export const h2: TypeRole = {
  fontSize: 23,
  lineHeight: 28,
  fontWeight: "600",
  letterSpacing: 0,
};

// h3 is not tabulated in design.md §4; chosen between h2 and body.
export const h3: TypeRole = {
  fontSize: 19,
  lineHeight: 24,
  fontWeight: "600",
  letterSpacing: 0,
};

// Body (15–16, line height 1.45).
export const body: TypeRole = {
  fontSize: 16,
  lineHeight: 23,
  fontWeight: "400",
  letterSpacing: 0,
};

// Small / label (12–13, line height 1.3).
export const small: TypeRole = {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: "500",
  letterSpacing: 0,
};

// Mono role for tabular financial figures: Inter with tabular figures
// (applied via fontVariant at the component layer), no separate family.
export const mono: TypeRole = {
  fontSize: 15,
  lineHeight: 22,
  fontWeight: "500",
  letterSpacing: 0,
};
