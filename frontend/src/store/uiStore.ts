/** Ephemeral UI state: mobile menu, selected time range. */

import { create } from "zustand";
import type { TimeRange } from "@/types/api.types";

interface UiState {
  mobileMenuOpen: boolean;
  timeRange: TimeRange;
  toggleMobileMenu: () => void;
  setMobileMenu: (open: boolean) => void;
  setTimeRange: (range: TimeRange) => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileMenuOpen: false,
  timeRange: "today",
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  setMobileMenu: (open) => set({ mobileMenuOpen: open }),
  setTimeRange: (range) => set({ timeRange: range }),
}));
