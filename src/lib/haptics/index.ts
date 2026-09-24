// Haptics helpers. Components call these, never expo-haptics directly.
// Failures are swallowed: haptics must never break an interaction.
import * as Haptics from "expo-haptics";

/** Light impact: successful confirmation (e.g. Button press). */
export async function confirm(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics unavailable on this device; interaction already succeeded.
  }
}

/** Selection tick: selection changes (e.g. Chip toggle). */
export async function select(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Haptics unavailable on this device; interaction already succeeded.
  }
}

/** Medium impact: destructive-action confirmation. */
export async function destroy(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Haptics unavailable on this device; interaction already succeeded.
  }
}
