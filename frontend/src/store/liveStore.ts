/**
 * Live stream state: webcam device, FPS, detection boxes, and inference controls.
 *
 * The camera is a real `getUserMedia` MediaStream (stored here since Zustand can
 * hold non-serializable values). Detection boxes are still mock ticks overlaid on
 * the live frame; they'll be driven by the WebSocket channel once the backend exists.
 */

import { create } from "zustand";
import type { DetectionBox, StreamSettings } from "@/types/model.types";
import { MOCK_STREAM_SETTINGS, mockDetectionBoxes } from "@/services/mock.data";

export type CameraStatus = "idle" | "requesting" | "active" | "denied" | "error";

/** "environment" = rear camera (default, ideal for overhead/farm use on phones). */
export type FacingMode = "environment" | "user";

interface LiveState {
  // Camera device
  stream: MediaStream | null;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  facingMode: FacingMode;

  // Inference / playback (overlaid on the live frame)
  fps: number;
  boxes: DetectionBox[];
  settings: StreamSettings;

  startCamera: () => Promise<void>;
  stopCamera: () => void;
  switchCamera: () => Promise<void>;
  tick: () => void;
  updateSettings: (patch: Partial<StreamSettings>) => void;
}

/** Stop and release every track on a stream. */
function releaseStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export const useLiveStore = create<LiveState>((set, get) => ({
  stream: null,
  cameraStatus: "idle",
  cameraError: null,
  facingMode: "environment",

  fps: 0,
  boxes: [],
  settings: MOCK_STREAM_SETTINGS,

  startCamera: async () => {
    const { stream: existing, facingMode } = get();
    if (!navigator.mediaDevices?.getUserMedia) {
      set({ cameraStatus: "error", cameraError: "Camera API not available in this browser." });
      return;
    }

    releaseStream(existing);
    set({ cameraStatus: "requesting", cameraError: null });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // `ideal` (not `exact`) so desktops without a rear camera fall back gracefully.
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      set({ stream, cameraStatus: "active", fps: 24 });
    } catch (err) {
      const e = err as DOMException;
      const denied = e?.name === "NotAllowedError" || e?.name === "SecurityError";
      set({
        stream: null,
        cameraStatus: denied ? "denied" : "error",
        cameraError: denied ? "Camera permission was denied." : e?.message ?? "Could not start camera.",
      });
    }
  },

  stopCamera: () => {
    releaseStream(get().stream);
    set({ stream: null, cameraStatus: "idle", boxes: [], fps: 0 });
  },

  switchCamera: async () => {
    const next: FacingMode = get().facingMode === "environment" ? "user" : "environment";
    set({ facingMode: next });
    if (get().cameraStatus === "active") await get().startCamera();
  },

  tick: () =>
    set({
      boxes: mockDetectionBoxes(),
      fps: Math.round((22 + Math.random() * 3) * 10) / 10,
    }),

  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
}));
