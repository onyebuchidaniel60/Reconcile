import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

// Static gate against the "works on web, exits on device" bug class:
// a missing/misplaced Reanimated babel plugin and unresolvable native
// modules. This does NOT replace on-device verification (EAS + operator).

const ROOT = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (full.endsWith(".tsx") && !full.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("native safety gate", () => {
  it("ends the babel plugin list with react-native-reanimated/plugin", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require("../babel.config.js")({ cache: () => {} }) as {
      plugins?: unknown[];
    };
    expect(Array.isArray(config.plugins)).toBe(true);
    expect(config.plugins?.length).toBeGreaterThan(0);
    expect(config.plugins?.[config.plugins.length - 1]).toBe(
      "react-native-reanimated/plugin",
    );
  });

  it("uses only cross-platform react-native-svg primitives in charts", () => {
    const allowed = new Set([
      "Svg",
      "Defs",
      "G",
      "Rect",
      "Circle",
      "Polyline",
      "Path",
      "Pattern",
      "Line",
    ]);
    const files = sourceFiles(join(ROOT, "src", "components"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const match = source.match(/import\s*\{([^}]*)\}\s*from\s*"react-native-svg"/);
      if (!match) continue;
      const names = match[1]
        .split(",")
        .map((part) => part.trim().split(" as ")[0].trim())
        .filter((name) => name.length > 0);
      for (const name of names) {
        expect(`${file}: ${name}`).toBe(`${file}: ${[...allowed].find((a) => a === name) ?? "BLOCKED"}`);
      }
    }
  });

  it("keeps HatchPattern in the audited Android-safe form", () => {
    const source = readFileSync(join(ROOT, "src", "components", "HatchPattern.tsx"), "utf8");
    expect(source).toMatch('patternUnits="userSpaceOnUse"');
  });

  it("resolves every lucide icon imported by components", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const icons = require("lucide-react-native") as Record<string, unknown>;
    const files = [
      ...sourceFiles(join(ROOT, "src", "components")),
      ...sourceFiles(join(ROOT, "app")),
    ];
    const names = new Set<string>();
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(
        /import\s*\{([^}]*)\}\s*from\s*"lucide-react-native"/g,
      )) {
        for (const part of match[1].split(",")) {
          const name = part.trim().split(" as ")[0].trim();
          if (!name || name === "type" || name === "LucideIcon" || name.startsWith("type ")) {
            continue;
          }
          names.add(name);
        }
      }
    }
    expect(names.size).toBeGreaterThan(0);
    const missing = [...names].filter((name) => icons[name] === undefined);
    expect(missing).toEqual([]);
  });
});
