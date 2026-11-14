/** Central registry of backend endpoint paths (relative to API_URL). */

export const ENDPOINTS = {
  farms: "/farms",
  houses: "/houses",
  poultryReport: "/report/poultry",
  zones: "/zones",
  performance: "/metrics/performance",
  streamSettings: "/stream/settings",
  systemStatus: "/system/status",
  alerts: "/alerts",
  model: "/model",
} as const;
