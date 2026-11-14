/** Shared primitive/util types used across the app. */

export type ID = string;

export type ISODateString = string;

/** A single point in a time series (e.g. sparkline / line chart). */
export interface TimeSeriesPoint {
  /** Bucket label — e.g. "12:00" or an ISO timestamp. */
  t: string;
  value: number;
}

/** Behavioral activity states a tracked bird can be in. */
export type ActivityState = "active" | "resting" | "feeding" | "anomaly";

/** Online/offline connectivity states. */
export type ConnectionState = "connected" | "connecting" | "disconnected";
