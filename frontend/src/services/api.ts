/**
 * Data access layer. Components and stores call these functions only — never
 * axios directly. Talks to the FastAPI backend (`app/routers/`).
 *
 * Flow: uploadVideo() -> put `stream_url` in an <img> (that request is what
 * starts processing on the server) -> poll getVideoStats() until it ends.
 */

import { ENDPOINTS } from "./endpoints";
import { http } from "./interceptors";
import type { Health, UploadResponse, VideoStats } from "@/types/video.types";

export const api = {
  getHealth: async (): Promise<Health> => {
    const res = await http.get<Health>(ENDPOINTS.health, { timeout: 4_000 });
    return res.data;
  },

  uploadVideo: async (
    file: File,
    onProgress?: (fraction: number) => void,
  ): Promise<UploadResponse> => {
    const form = new FormData();
    form.append("file", file);

    const res = await http.post<UploadResponse>(ENDPOINTS.upload, form, {
      timeout: 0, // large files: no client timeout
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(e.loaded / e.total);
      },
    });
    return res.data;
  },

  getVideoStats: async (videoId: string): Promise<VideoStats> => {
    const res = await http.get<VideoStats>(ENDPOINTS.videoStats(videoId));
    return res.data;
  },
};
