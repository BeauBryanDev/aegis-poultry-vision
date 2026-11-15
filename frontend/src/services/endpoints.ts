/** Central registry of backend endpoint paths (relative to API_URL). */

export const ENDPOINTS = {
  health: "/health",
  upload: "/upload",
  videoStats: (videoId: string) => `/videos/${videoId}/stats`,
} as const;
