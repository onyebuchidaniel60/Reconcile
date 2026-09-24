// Motion infrastructure (frontend-implementation-plan.md §5). Components
// consume these helpers; nothing outside this folder calls Reanimated or
// expo-haptics directly for these interactions.
export { useMotion } from "../../theme/motion";
export { usePressScale, type PressScale } from "./usePressScale";
export { useCardEntrance } from "./useCardEntrance";
export { useConfirmPulse, type ConfirmPulse } from "./useConfirmPulse";
export { useChartReveal, type ChartReveal } from "./useChartReveal";
