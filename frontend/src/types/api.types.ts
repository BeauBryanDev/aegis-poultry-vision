/** Transport-level API contract types (request/response envelopes). */

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export type TimeRange = "today" | "week" | "month";
