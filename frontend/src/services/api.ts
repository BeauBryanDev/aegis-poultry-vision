/**
 * Data access layer. Components call these functions only — never axios or the
 * mock module directly. While USE_MOCKS is true they resolve fixtures; flip the
 * flag (constants.ts) once FastAPI endpoints exist and the same signatures hold.
 */

import { USE_MOCKS } from "@/utils/constants";
import { ENDPOINTS } from "./endpoints";
import { http } from "./interceptors";
import * as mock from "./mock.data";
import type {
  AiModelInfo,
  Alert,
  Farm,
  House,
  PerformanceMetrics,
  PoultryReport,
  StreamSettings,
  SystemStatus,
  Zone,
} from "@/types/model.types";

/** Simulate network latency so loading states are exercised against mocks. */
function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function get<T>(path: string, mockValue: T): Promise<T> {
  if (USE_MOCKS) return delay(mockValue);
  const res = await http.get<{ data: T }>(path);
  return res.data.data;
}

export const api = {
  getFarms: () => get<Farm[]>(ENDPOINTS.farms, mock.MOCK_FARMS),
  getHouses: () => get<House[]>(ENDPOINTS.houses, mock.MOCK_HOUSES),
  getModel: () => get<AiModelInfo>(ENDPOINTS.model, mock.MOCK_MODEL),
  getPoultryReport: () => get<PoultryReport>(ENDPOINTS.poultryReport, mock.MOCK_POULTRY_REPORT),
  getZones: () => get<Zone[]>(ENDPOINTS.zones, mock.MOCK_ZONES),
  getPerformance: () => get<PerformanceMetrics>(ENDPOINTS.performance, mock.MOCK_PERFORMANCE),
  getStreamSettings: () => get<StreamSettings>(ENDPOINTS.streamSettings, mock.MOCK_STREAM_SETTINGS),
  getSystemStatus: () => get<SystemStatus>(ENDPOINTS.systemStatus, mock.MOCK_SYSTEM_STATUS),
  getAlerts: () => get<Alert[]>(ENDPOINTS.alerts, mock.MOCK_ALERTS),
};
