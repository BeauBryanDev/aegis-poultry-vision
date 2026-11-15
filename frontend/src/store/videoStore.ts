/**
 * Uploaded-video analysis state.
 *
 * upload() sends the file, points `streamImage` at the MJPEG stream (that
 * request is what runs the pipeline on the server), then polls /stats every
 * 500 ms until the job ends.
 *
 * `streamImage` is one <img> element owned by this module, not by a React
 * component: pages attach it to the DOM while they are visible. If a component
 * owned it, leaving the Dashboard would unmount it, close the stream, and
 * cancel the analysis on the server.
 */

import { create } from "zustand";
import { api } from "@/services/api";
import type { VideoStats } from "@/types/video.types";

export type VideoPhase = "idle" | "uploading" | "processing" | "done" | "cancelled" | "error";

/** One sample of the run, kept for the charts. */
export interface HistoryPoint {
  /** Video time in seconds. */
  time: number;
  live: number;
  anomalies: number;
  events: number;
  /** Mean speed of the moving birds, body lengths per second. */
  speed: number;
}

/** The annotated MJPEG stream. Keeps its last frame after the stream ends. */
export const streamImage = new Image();
streamImage.alt = "Annotated video stream";

function closeStream() {
  streamImage.removeAttribute("src");
}

const POLL_MS = 500;
const MAX_HISTORY = 600;

interface VideoState {
  phase: VideoPhase;
  fileName: string | null;
  uploadProgress: number;
  error: string | null;
  /** True while `streamImage` holds a frame worth showing. */
  hasFrame: boolean;
  stats: VideoStats | null;
  history: HistoryPoint[];

  upload: (file: File) => Promise<void>;
  /** Stop watching: dropping the stream cancels processing on the server. */
  stop: () => void;
  reset: () => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function meanSpeed(stats: VideoStats): number {
  const moving = stats.tracks.filter((t) => t.speed > 0);
  if (!moving.length) return 0;
  return moving.reduce((sum, t) => sum + t.speed, 0) / moving.length;
}

export const useVideoStore = create<VideoState>((set, get) => {
  const poll = async (videoId: string) => {
    try {
      const stats = await api.getVideoStats(videoId);
      if (get().stats?.video_id !== videoId) return; // a newer upload replaced it

      const previous = get().stats;
      const advanced = stats.frame_index !== previous?.frame_index;

      set((s) => ({
        stats,
        history: advanced
          ? [
              ...s.history,
              {
                time: stats.frame_index / stats.fps,
                live: stats.live_count,
                anomalies: stats.anomaly.active,
                events: stats.anomaly.total_events,
                speed: Math.round(meanSpeed(stats) * 100) / 100,
              },
            ].slice(-MAX_HISTORY)
          : s.history,
      }));

      if (stats.status === "done" || stats.status === "cancelled" || stats.status === "error") {
        stopPolling();
        set({ phase: stats.status, error: stats.error });
      }
    } catch (err) {
      stopPolling();
      closeStream();
      set({ phase: "error", error: (err as Error).message, hasFrame: false });
    }
  };

  return {
    phase: "idle",
    fileName: null,
    uploadProgress: 0,
    error: null,
    hasFrame: false,
    stats: null,
    history: [],

    upload: async (file) => {
      stopPolling();
      closeStream();
      set({
        phase: "uploading",
        fileName: file.name,
        uploadProgress: 0,
        error: null,
        hasFrame: false,
        stats: null,
        history: [],
      });

      try {
        const job = await api.uploadVideo(file, (fraction) => set({ uploadProgress: fraction }));
        streamImage.src = job.stream_url;
        set({ phase: "processing", stats: job, hasFrame: true });
        pollTimer = setInterval(() => poll(job.video_id), POLL_MS);
      } catch (err) {
        set({ phase: "error", error: (err as Error).message });
      }
    },

    stop: () => {
      if (get().phase !== "processing") return;
      // Closing the stream makes the server mark the job cancelled; the next
      // poll picks that up.
      closeStream();
      set({ hasFrame: false });
    },

    reset: () => {
      stopPolling();
      closeStream();
      set({
        phase: "idle",
        fileName: null,
        uploadProgress: 0,
        error: null,
        hasFrame: false,
        stats: null,
        history: [],
      });
    },
  };
});
