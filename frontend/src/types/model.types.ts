/** Dashboard view models (built in the pages from the backend stats). */

import type { ActivityState, ID } from "./common.types";

/** A per-activity count with its share of the flock. */
export interface ActivityBreakdown {
  state: ActivityState;
  count: number;
  /** Percentage of the flock, 0–100. */
  percent: number;
}

/** One quadrant of the frame and the birds currently in it. */
export interface Zone {
  id: ID;
  name: string; // "Zone 1"
  count: number;
}

/** v2 live camera: a detection box drawn over the webcam frame. */
export interface DetectionBox {
  id: ID;
  /** Normalized [0,1] coordinates relative to the frame. */
  x: number;
  y: number;
  w: number;
  h: number;
  state: ActivityState;
  confidence: number;
}

/** v2 live camera: inference/stream runtime controls. */
export interface StreamSettings {
  model: string;
  confidenceThreshold: number; // 0–1
  iouThreshold: number; // 0–1
  quality: "SD" | "HD" | "FHD";
}
