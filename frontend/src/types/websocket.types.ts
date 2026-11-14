/** Live WebSocket message contract for the stream/telemetry channel. */

import type { DetectionBox } from "./model.types";

/** Server -> client live frame telemetry. */
export interface LiveFrameMessage {
  type: "frame";
  fps: number;
  boxes: DetectionBox[];
  liveCount: number;
  timestamp: string;
}

/** Server -> client anomaly push. */
export interface AnomalyMessage {
  type: "anomaly";
  id: string;
  zone: string;
  timestamp: string;
}

export type WsMessage = LiveFrameMessage | AnomalyMessage;
