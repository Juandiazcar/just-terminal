import { create } from "zustand"

type ExplorerMode = "idle" | "new-file" | "new-folder" | "search"

interface ExplorerUIState {
  mode: ExplorerMode
  searchQuery: string
  setMode: (mode: ExplorerMode) => void
  setSearchQuery: (q: string) => void
  reset: () => void
}

export const useExplorerUIStore = create<ExplorerUIState>((set) => ({
  mode: "idle",
  searchQuery: "",
  setMode: (mode) => set({ mode }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  reset: () => set({ mode: "idle", searchQuery: "" }),
}))
