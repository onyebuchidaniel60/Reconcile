// Design tokens — layout bounds (frontend-implementation-plan.md §3).
// Structural caps with no color/type equivalent, e.g. the centered content
// column max width for auth/setup forms on tablet viewports.

export const layout = {
  /** Centered form column cap for FormScaffold on wide viewports. */
  formMaxWidth: 480,
} as const;

export type LayoutName = keyof typeof layout;
