// Token enforcement scan (frontend-implementation-plan.md §3).
// Greps app/ and src/ for hard-coded design values outside src/theme/:
//   - hex colors (#RRGGBB, #RGB)
//   - numeric literals in fontSize/padding/margin/gap/borderRadius/duration
// Excludes: src/theme/, test files, fixtures, generated files.
// Informational in Phase 3 (not wired into the check chain); Phase 4 enforces.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)), "/");
const EXTENSIONS = new Set([".ts", ".tsx"]);
const EXCLUDE_DIRS = ["src/theme"];
const EXCLUDE_FILES = [/\.test\.[jt]sx?$/, /fixture/i, /\.d\.ts$/];

const HEX_RE = /#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b/g;
const NUMERIC_RE =
  /(fontSize|padding(?:Top|Bottom|Left|Right|Vertical|Horizontal)?|margin(?:Top|Bottom|Left|Right|Vertical|Horizontal)?|gap|borderRadius|duration)\s*:\s*(-?\d+(?:\.\d+)?)/g;

function excluded(relativePath) {
  if (EXCLUDE_DIRS.some((dir) => relativePath === dir || relativePath.startsWith(`${dir}/`))) {
    return true;
  }
  return EXCLUDE_FILES.some((re) => re.test(relativePath));
}

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const relative = full.slice(ROOT.length).replace(/\\/g, "/");
    if (statSync(full).isDirectory()) {
      if (!excluded(relative)) walk(full, out);
    } else if ([...EXTENSIONS].some((ext) => full.endsWith(ext)) && !excluded(relative)) {
      out.push({ full, relative });
    }
  }
  return out;
}

const violations = [];
for (const { full, relative } of walk(join(ROOT, "app"), []).concat(
  walk(join(ROOT, "src"), []),
)) {
  const lines = readFileSync(full, "utf8").split("\n");
  lines.forEach((line, index) => {
    for (const match of line.matchAll(HEX_RE)) {
      violations.push(`${relative}:${index + 1}: hex color ${match[0]}`);
    }
    for (const match of line.matchAll(NUMERIC_RE)) {
      violations.push(
        `${relative}:${index + 1}: numeric ${match[1]} (${match[2]})`,
      );
    }
  });
}

if (violations.length > 0) {
  console.log(`token violations: ${violations.length}`);
  for (const violation of violations) console.log(`  ${violation}`);
} else {
  console.log("token violations: 0");
}
process.exit(violations.length > 0 ? 1 : 0);
