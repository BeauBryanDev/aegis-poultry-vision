/** Global app state: backend health (polled from the layout). */

import { create } from "zustand";
import { api } from "@/services/api";

export type BackendStatus = "checking" | "online" | "degraded" | "offline";

interface AppState {
  backend: BackendStatus;
  checkHealth: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  backend: "checking",
  checkHealth: async () => {
    try {
      const health = await api.getHealth();
      set({ backend: health.status === "ok" ? "online" : "degraded" });
    } catch {
      set({ backend: "offline" });
    }
  },
}));
