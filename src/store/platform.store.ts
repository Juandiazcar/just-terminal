import { create } from "zustand"
import type { PlatformInfo } from "@/types/platform.types"

interface PlatformState {
  info: PlatformInfo | null
  setInfo: (info: PlatformInfo) => void
}

export const usePlatformStore = create<PlatformState>((set) => ({
  info: null,
  setInfo: (info) => set({ info }),
}))
