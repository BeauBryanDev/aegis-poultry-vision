/**
 * Mock data layer — realistic fixtures matching the dashboard mockup.
 * Consumed only through `services/api.ts` (behind USE_MOCKS), so swapping to
 * the real FastAPI endpoints later requires no component changes.
 */

import type { TimeSeriesPoint } from "@/types/common.types";
import type {
  AiModelInfo,
  Alert,
  DetectionBox,
  Farm,
  House,
  PerformanceMetrics,
  PoultryReport,
  StreamSettings,
  SystemStatus,
  Zone,
} from "@/types/model.types";

/** Deterministic pseudo-random series so charts look alive but stable per load. */
function series(count: number, base: number, spread: number, labelFor: (i: number) => string): TimeSeriesPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    t: labelFor(i),
    value: Math.round(base + Math.sin(i * 0.7) * spread + (i % 3) * (spread / 4)),
  }));
}

export const MOCK_FARMS: Farm[] = [
  { id: "farm-4", name: "Sunrise Farm #4" },
  { id: "farm-2", name: "Green Valley Farm #2" },
];

export const MOCK_HOUSES: House[] = [
  { id: "house-02", farmId: "farm-4", name: "Broiler House 02" },
  { id: "house-01", farmId: "farm-4", name: "Broiler House 01" },
];

export const MOCK_MODEL: AiModelInfo = { name: "YOLOv8s (Fine-tuned)", active: true };

export const MOCK_POULTRY_REPORT: PoultryReport = {
  liveCount: 1256,
  density: 18.7,
  densityTrend: series(16, 17, 2.5, (i) => `${i}`),
  breakdown: [
    { state: "active", count: 1198, percent: 95.4 },
    { state: "resting", count: 42, percent: 3.3 },
    { state: "feeding", count: 12, percent: 1.0 },
    { state: "anomaly", count: 4, percent: 0.3 },
  ],
};

export const MOCK_ZONES: Zone[] = [
  { id: "z1", name: "Zone 1", count: 312 },
  { id: "z2", name: "Zone 2", count: 298 },
  { id: "z3", name: "Zone 3", count: 324 },
  { id: "z4", name: "Zone 4", count: 322 },
];

export const MOCK_STREAM_SETTINGS: StreamSettings = {
  model: "YOLOv8s (Fine-tuned)",
  confidenceThreshold: 0.45,
  iouThreshold: 0.5,
  quality: "HD",
};

export const MOCK_PERFORMANCE: PerformanceMetrics = {
  activityDistribution: [
    { state: "active", count: 1198, percent: 75.2 },
    { state: "resting", count: 225, percent: 14.1 },
    { state: "feeding", count: 132, percent: 8.3 },
    { state: "anomaly", count: 38, percent: 2.4 },
  ],
  birdCountOverTime: series(25, 1150, 350, (i) => `${String(i).padStart(2, "0")}:00`),
  activityRadar: [
    { axis: "Movement", value: 82 },
    { axis: "Feeding", value: 64 },
    { axis: "Resting", value: 48 },
    { axis: "Uniformity", value: 71 },
    { axis: "Density", value: 58 },
  ],
  anomalyAlerts: { today: 4, trend: series(14, 4, 2, (i) => `${i}`) },
  healthIndex: { value: 92, trend: series(14, 90, 4, (i) => `${i}`) },
};

export const MOCK_SYSTEM_STATUS: SystemStatus = {
  uptime: "7d 14h 22m",
  lastInferenceMs: 120,
  websocket: "connected",
  camera: "Cam 02 (Top View)",
  temperatureC: 28.4,
  humidityPct: 62,
};

export const MOCK_ALERTS: Alert[] = [
  {
    id: "a1",
    severity: "critical",
    title: "Clustering anomaly",
    message: "Abnormal crowding detected in Zone 3.",
    zone: "Zone 3",
    timestamp: new Date(Date.now() - 6 * 60_000).toISOString(),
    acknowledged: false,
  },
  {
    id: "a2",
    severity: "warning",
    title: "Reduced movement",
    message: "Low activity band near feeder line 2.",
    zone: "Zone 2",
    timestamp: new Date(Date.now() - 42 * 60_000).toISOString(),
    acknowledged: false,
  },
  {
    id: "a3",
    severity: "info",
    title: "Feeding cycle started",
    message: "Scheduled feeding detected across all zones.",
    timestamp: new Date(Date.now() - 90 * 60_000).toISOString(),
    acknowledged: true,
  },
];

/** Randomized detection boxes over the live frame (normalized coords). */
export function mockDetectionBoxes(count = 40): DetectionBox[] {
  return Array.from({ length: count }, (_, i) => {
    const anomaly = i % 13 === 0;
    return {
      id: `box-${i}`,
      x: Math.random() * 0.9,
      y: Math.random() * 0.9,
      w: 0.05 + Math.random() * 0.04,
      h: 0.06 + Math.random() * 0.05,
      state: anomaly ? "anomaly" : "active",
      confidence: 0.4 + Math.random() * 0.55,
    };
  });
}
