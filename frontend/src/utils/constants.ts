/** App-wide static constants. */

export const APP_NAME = "PoultryVision";
export const APP_TAGLINE = "AI Powered Poultry Monitoring";

/** FastAPI prefix; Vite proxies `/api` to localhost:8000 in dev. */
export const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";
export const WS_URL = import.meta.env.VITE_WS_URL ?? "/ws";

/** Name of the detector the backend runs (model/chickens_model.onnx). */
export const MODEL_NAME = "YOLO11s (chicken_v1)";

/** Video types the backend accepts (`ALLOWED_SUFFIXES` in app/routers/video.py). */
export const VIDEO_ACCEPT = ".mp4,.avi,.mov,.mkv,.webm";

/** Primary navigation — shared by desktop top-nav and mobile bottom-bar. */
export interface NavItem {
  key: string;
  label: string;
  path: string;
  /** Whether the item appears in the compact mobile bottom bar. */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", path: "/", mobile: true },
  { key: "monitor", label: "Monitor", path: "/monitor", mobile: true },
  { key: "analytics", label: "Analytics", path: "/analytics", mobile: true },
  { key: "reports", label: "Reports", path: "/reports" },
  { key: "alerts", label: "Alerts", path: "/alerts", mobile: true },
  { key: "history", label: "History", path: "/history" },
  { key: "settings", label: "Settings", path: "/settings", mobile: true },
];
