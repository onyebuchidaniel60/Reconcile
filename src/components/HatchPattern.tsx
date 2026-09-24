import { useId } from "react";
import { Pattern, Line } from "react-native-svg";
import { colors } from "../theme/colors";

interface HatchPatternProps {
  id?: string;
  color?: string;
}

/** Sanitize a React id for use as an SVG pattern id / url() reference. */
export function toPatternId(raw: string): string {
  return `hatch-${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
}

/**
 * 45° diagonal hatch (2px stroke, 4px gap) drawn in ink. Render inside an
 * SVG `<Defs>` block and reference shapes with `fill="url(#<id>)"` or
 * `stroke="url(#<id>)"`. Ids are unique per instance (React `useId`) so
 * multiple charts on one page never collide; pass `id` to pin one.
 */
export function HatchPattern({ id, color = colors.ink }: HatchPatternProps) {
  const autoId = useId();
  const patternId = id ?? toPatternId(autoId);
  return (
    <Pattern
      id={patternId}
      width={4}
      height={4}
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <Line x1={0} y1={0} x2={0} y2={4} stroke={color} strokeWidth={2} />
    </Pattern>
  );
}
