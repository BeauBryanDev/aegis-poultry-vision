/** App-wide static constants. */

export const APP_NAME = "PoultryVision";
export const APP_TAGLINE = "AI Powered Poultry Monitoring";

export const API_URL = import.meta.env.VITE_API_URL ?? "/api";
export const WS_URL = import.meta.env.VITE_WS_URL ?? "/ws";

/** Toggle the mock data layer. Flip to false once FastAPI endpoints exist. */
export const USE_MOCKS = true;

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
  { key: "monitor", label: "Live Monitor", path: "/monitor", mobile: true },
  { key: "analytics", label: "Analytics", path: "/analytics", mobile: true },
  { key: "reports", label: "Reports", path: "/reports" },
  { key: "alerts", label: "Alerts", path: "/alerts", mobile: true },
  { key: "history", label: "History", path: "/history" },
  { key: "settings", label: "Settings", path: "/settings", mobile: true },
];
