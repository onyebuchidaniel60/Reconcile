// Profile-photo helpers (Phase 10A.5, Fix 5). Pure path/content-type
// helpers are unit-tested; device/storage orchestration lives here so
// screens stay thin. Provider facts are never touched — only the user's
// own profile row and their `avatars/{user_id}/...` storage prefix.
import * as ImagePicker from "expo-image-picker";
import { getSupabase } from "./supabase";

export const AVATAR_BUCKET = "avatars";

/** "https://.../photo.PNG?x=1" → "png" (defaults to jpg). */
export function avatarFileExtension(localUri: string): "jpg" | "png" {
  const clean = localUri.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "png";
  return "jpg";
}

export function avatarContentType(extension: "jpg" | "png"): string {
  return extension === "png" ? "image/png" : "image/jpeg";
}

/** Storage path for a user's photo, e.g. `uid/avatar.jpg`. */
export function avatarStoragePath(userId: string, localUri: string): string {
  return `${userId}/avatar.${avatarFileExtension(localUri)}`;
}

/**
 * Opens the system gallery (1:1 crop where supported). Returns the local
 * file URI, or null when the user cancels. Throws a user-safe message when
 * permission is denied or the picker cannot open (web included — the
 * caller shows it inline, never crashes).
 */
export async function pickAvatarImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo access is needed to choose a profile photo.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;
  const uri = result.assets?.[0]?.uri;
  if (!uri) throw new Error("No photo was selected.");
  return uri;
}

/** Uploads a local image to the user's avatar path; returns the public URL. */
export async function uploadAvatarImage(
  userId: string,
  localUri: string,
): Promise<string> {
  const path = avatarStoragePath(userId, localUri);
  const response = await fetch(localUri);
  if (!response.ok) throw new Error("Could not read the selected photo.");
  const buffer = await response.arrayBuffer();
  const { error } = await getSupabase()
    .storage.from(AVATAR_BUCKET)
    .upload(path, buffer, {
      contentType: avatarContentType(avatarFileExtension(localUri)),
      upsert: true,
    });
  if (error) throw new Error("Photo upload failed. Please try again.");
  const { data } = getSupabase().storage.from(AVATAR_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("Photo upload failed. Please try again.");
  return data.publicUrl;
}

/** Deletes every object under the user's avatar prefix (best-effort). */
export async function removeAvatarObjects(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { data } = await supabase.storage.from(AVATAR_BUCKET).list(userId);
  const paths = (data ?? []).map((entry) => `${userId}/${entry.name}`);
  if (paths.length === 0) return;
  await supabase.storage.from(AVATAR_BUCKET).remove(paths);
}
