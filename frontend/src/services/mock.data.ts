/**
 * Fixtures for the v2 live-camera path only (`store/liveStore.ts`), which is
 * not wired to the backend yet. Everything on screen today comes from the real
 * API through `services/api.ts`.
 */

import type { DetectionBox, StreamSettings } from "@/types/model.types";

export const MOCK_STREAM_SETTINGS: StreamSettings = {
  model: "YOLO11s (chicken_v1)",
  confidenceThreshold: 0.45,
  iouThreshold: 0.5,
  quality: "HD",
};

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
