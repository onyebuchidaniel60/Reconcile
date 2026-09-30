import { describe, expect, it, jest } from "@jest/globals";
import {
  avatarContentType,
  avatarFileExtension,
  avatarStoragePath,
} from "../src/lib/avatar";

// avatar.ts pulls the Supabase client (AsyncStorage native module); the
// pure helpers under test never touch it.
jest.mock("../src/lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

describe("avatar path helpers (Phase 10A.5)", () => {
  it("derives jpg by default and png for png files", () => {
    expect(avatarFileExtension("file:///x/photo.jpg")).toBe("jpg");
    expect(avatarFileExtension("file:///x/photo.jpeg")).toBe("jpg");
    expect(avatarFileExtension("file:///x/photo.png")).toBe("png");
    expect(avatarFileExtension("file:///x/photo.PNG?edit=1")).toBe("png");
    expect(avatarFileExtension("file:///x/photo")).toBe("jpg");
  });

  it("maps extensions to content types", () => {
    expect(avatarContentType("jpg")).toBe("image/jpeg");
    expect(avatarContentType("png")).toBe("image/png");
  });

  it("scopes storage paths under the user id", () => {
    expect(avatarStoragePath("u1", "file:///x/a.jpg")).toBe("u1/avatar.jpg");
    expect(avatarStoragePath("u1", "file:///x/a.png")).toBe("u1/avatar.png");
  });
});
