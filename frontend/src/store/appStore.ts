/** Global app selection state: active farm, house, and AI model info. */

import { create } from "zustand";
import type { AiModelInfo, Farm, House } from "@/types/model.types";
import { MOCK_FARMS, MOCK_HOUSES, MOCK_MODEL } from "@/services/mock.data";

interface AppState {
  farms: Farm[];
  houses: House[];
  model: AiModelInfo;
  activeFarmId: string;
  activeHouseId: string;
  setActiveFarm: (id: string) => void;
  setActiveHouse: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  farms: MOCK_FARMS,
  houses: MOCK_HOUSES,
  model: MOCK_MODEL,
  activeFarmId: MOCK_FARMS[0].id,
  activeHouseId: MOCK_HOUSES[0].id,
  setActiveFarm: (id) => set({ activeFarmId: id }),
  setActiveHouse: (id) => set({ activeHouseId: id }),
}));
