/** Domain models for the PoultryVision dashboard. */

import type { ActivityState, ID, TimeSeriesPoint } from "./common.types";

export interface Farm {
  id: ID;
  name: string;
}

export interface House {
  id: ID;
  farmId: ID;
  name: string;
}

export interface AiModelInfo {
  name: string; // e.g. "YOLOv8s (Fine-tuned)"
  active: boolean;
}

/** A per-activity count with its share of the flock. */
export interface ActivityBreakdown {
  state: ActivityState;
  count: number;
  /** Percentage of the flock, 0–100. */
  percent: number;
}

/** Headline "Poultry Report" panel data (left column of the dashboard). */
export interface PoultryReport {
  liveCount: number;
  density: number; // birds / m²
  densityTrend: TimeSeriesPoint[]; // sparkline
  breakdown: ActivityBreakdown[];
}

export interface Zone {
  id: ID;
  name: string; // "Zone 1"
  count: number;
}

/** A detection bounding box drawn over the live stream frame. */
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

/** Inference/stream runtime controls (below the video). */
export interface StreamSettings {
  model: string;
  confidenceThreshold: number; // 0–1
  iouThreshold: number; // 0–1
  quality: "SD" | "HD" | "FHD";
}

/** Right-column performance metrics. */
export interface PerformanceMetrics {
  activityDistribution: ActivityBreakdown[];
  birdCountOverTime: TimeSeriesPoint[];
  activityRadar: { axis: string; value: number }[];
  anomalyAlerts: { today: number; trend: TimeSeriesPoint[] };
  healthIndex: { value: number; trend: TimeSeriesPoint[] };
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: ID;
  severity: AlertSeverity;
  title: string;
  message: string;
  zone?: string;
  timestamp: string; // ISO
  acknowledged: boolean;
}

/** Footer status strip. */
export interface SystemStatus {
  uptime: string; // "7d 14h 22m"
  lastInferenceMs: number;
  websocket: "connected" | "connecting" | "disconnected";
  camera: string;
  temperatureC: number;
  humidityPct: number;
}
