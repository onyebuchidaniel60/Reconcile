import { useState } from "react";
import { Image, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { Text, type TextRole } from "./Text";

export type AvatarSize = 32 | 40 | 48 | 64;

interface AvatarProps {
  displayName: string;
  size?: AvatarSize;
  /** Optional photo. When provided the image renders instead of the initial. */
  photoSource?: ImageSourcePropType;
  /** Convenience for remote photos: `{ uri }` unless null. */
  uri?: string | null;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const AVATAR_TINTS = [colors.coral, colors.mint, colors.mist, colors.lavender] as const;

const SIZE_ROLES: Record<AvatarSize, TextRole> = {
  32: "small",
  40: "body",
  48: "h3",
  64: "h1",
};

/** Deterministic tint from the display name: hash → one secondary surface. */
export function avatarTintForName(displayName: string): string {
  let hash = 0;
  for (let index = 0; index < displayName.length; index += 1) {
    hash = (hash * 31 + displayName.charCodeAt(index)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

/** First letter of the display name, upper-cased. Falls back to "?". */
export function avatarInitialForName(displayName: string): string {
  const trimmed = displayName.trim();
  if (trimmed.length === 0) return "?";
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Circular avatar: initial-based with a deterministic secondary-surface
 * tint and ink text, or a photo when `photoSource`/`uri` is provided. A
 * photo that fails to load falls back to the initial (never a blank hole).
 */
export function Avatar({
  displayName,
  size = 40,
  photoSource,
  uri,
  testID,
  style,
}: AvatarProps) {
  // A photo that fails to load falls back to the initial. The failure is
  // keyed by source so a *new* uri retries instead of inheriting the old
  // failure — no effect needed.
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const source = photoSource ?? (uri ? { uri } : undefined);
  const sourceKey = uri ?? (photoSource ? "external-photo" : null);
  const showPhoto = source !== undefined && failedKey !== sourceKey;
  const circle = {
    width: size,
    height: size,
    borderRadius: radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
  };
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={displayName}
      testID={testID}
      style={[
        circle,
        { backgroundColor: showPhoto ? colors.line : avatarTintForName(displayName) },
        style,
      ]}
    >
      {showPhoto ? (
        <Image
          source={source}
          onError={() => setFailedKey(sourceKey)}
          testID={testID ? `${testID}-image` : "avatar-image"}
          style={{ width: size, height: size }}
        />
      ) : (
        <Text role={SIZE_ROLES[size]} color="ink" style={{ fontWeight: "600" }}>
          {avatarInitialForName(displayName)}
        </Text>
      )}
    </View>
  );
}
