/**
 * Mirrors the backend JSON (`app/routers/video.py` + `VideoPipeline.stats()`).
 * Change this file together with those two.
 */

/** Activity states the backend assigns to a tracked bird. */
export type BirdState = "resting" | "active" | "anomaly";

export const BIRD_STATES: BirdState[] = ["resting", "active", "anomaly"];

export type VideoStatus = "pending" | "processing" | "done" | "cancelled" | "error";

/** One tracked bird in the current frame. */
export interface Track {
  id: number;
  confidence: number;
  state: BirdState;
  /** Normalized [x1, y1, x2, y2], 0..1 relative to the frame. */
  box: [number, number, number, number];
  /** Velocity in px/s (camera motion removed). */
  vx: number;
  vy: number;
  /** Speed in body lengths per second. */
  speed: number;
  /** Acceleration in body lengths per second squared. */
  accel: number;
}

/** A bird that suddenly sped up. */
export interface AnomalyEvent {
  id: number;
  track_id: number;
  /** Seconds from the start of the video. */
  time_s: number;
  trigger: "speed" | "acceleration";
  speed: number;
  accel: number;
  /** The bird's own median speed just before the burst. */
  baseline: number;
  /** speed / baseline */
  ratio: number;
  /** Normalized [x, y] of the bird in the frame. */
  position: [number, number];
}

export interface AnomalyState {
  /** Birds flagged in the current frame. */
  active: number;
  detected: boolean;
  total_events: number;
  events: AnomalyEvent[];
  thresholds: { speed: number; accel: number; baseline_ratio: number };
}

/** GET /videos/{id}/stats */
export interface VideoStats {
  video_id: string;
  status: VideoStatus;
  error: string | null;
  fps: number;
  frame_count: number;
  width: number;
  height: number;
  /** 0..1 */
  progress: number;
  frame_index: number;
  processing_fps: number;
  live_count: number;
  peak_count: number;
  total_unique: number;
  states: Record<BirdState, number>;
  tracks: Track[];
  anomaly: AnomalyState;
}

/** POST /upload */
export interface UploadResponse extends VideoStats {
  stream_url: string;
  stats_url: string;
}

/** GET /health */
export interface Health {
  status: "ok" | "degraded";
  app: string;
  models_loaded: boolean;
}
