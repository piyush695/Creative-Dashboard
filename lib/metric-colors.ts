/**
 * Canonical metric / change color scheme for the whole dashboard.
 *
 *   • Green  → positive values (improvement, gains, "up")
 *   • Blue   → neutral / informational values (no change, baseline metrics)
 *   • Red    → negative values (decline, losses, "down")
 *
 * Use the hex constants for inline `style`/chart colors and the Tailwind
 * class helpers for text. Kept in one place so every surface stays consistent
 * with the dashboard's design system (emerald / blue / red brand semantics).
 */

// Hex values — for chart strokes, SVG, and inline styles.
export const METRIC_POSITIVE = "#10b981"; // emerald-500
export const METRIC_NEUTRAL = "#3b82f6"; // blue-500
export const METRIC_NEGATIVE = "#ef4444"; // red-500

export type MetricDirection = "up" | "down" | "flat";

/** Normalize a numeric delta (or an explicit direction) to a direction. */
export function metricDirection(value: number): MetricDirection {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

/** Hex color for a numeric change value. */
export function metricChangeColor(value: number): string {
  const dir = metricDirection(value);
  return dir === "up" ? METRIC_POSITIVE : dir === "down" ? METRIC_NEGATIVE : METRIC_NEUTRAL;
}

/** Hex color for an explicit direction (supports "flat"/"neutral"). */
export function metricDirectionColor(dir: MetricDirection): string {
  return dir === "up" ? METRIC_POSITIVE : dir === "down" ? METRIC_NEGATIVE : METRIC_NEUTRAL;
}

/** Tailwind text-color class for a numeric change value. */
export function metricChangeTextClass(value: number): string {
  const dir = metricDirection(value);
  return dir === "up"
    ? "text-emerald-500"
    : dir === "down"
      ? "text-red-500"
      : "text-blue-500";
}
