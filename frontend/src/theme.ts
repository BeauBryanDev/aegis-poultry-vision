/**
 * Shared theme constants for use in JS/TS contexts where Tailwind classes
 * can't reach — e.g. Recharts series colors, canvas box strokes.
 * Keep these in sync with tailwind.config.ts.
 */

import type { ActivityState } from "./types/common.types";

export const COLORS = {
  background: "#06060a",
  surface: "#0d0e15",
  surfaceMuted: "#12131c",
  border: "#1e2030",
  primary: "#f9a826",
  primaryLight: "#fbbd5e",
  secondary: "#2dd4bf",
  text: "#e5e7eb",
  textMuted: "#9ca3af",
  textDim: "#6b7280",
  active: "#22c55e",
  resting: "#f9a826",
  feeding: "#ff9800",
  anomaly: "#f44336",
  health: "#22c55e",
} as const;

/** Color used to render each activity state (chart series, detection boxes, legend). */
export const ACTIVITY_COLOR: Record<ActivityState, string> = {
  active: COLORS.active,
  resting: COLORS.resting,
  feeding: COLORS.feeding,
  anomaly: COLORS.anomaly,
};

export const ACTIVITY_LABEL: Record<ActivityState, string> = {
  active: "Active",
  resting: "Resting",
  feeding: "Feeding",
  anomaly: "Anomaly",
};
