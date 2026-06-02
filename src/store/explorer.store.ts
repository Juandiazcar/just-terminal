import { create } from "zustand"
import type { DirEntry } from "@/types/explorer.types"
import { listDir, watchDir, unwatchDir } from "@/lib/tauri-bridge"
import { handleCommandError } from "@/lib/error-handler"

interface ExplorerState {
  cwd: string
  entries: DirEntry[]
  expandedPaths: Set<string>
  showHidden: boolean
  isLoading: boolean
  watchedPath: string | null

  setCwd: (path: string) => Promise<void>
  refresh: () => Promise<void>
  toggleExpanded: (path: string) => void
  toggleHidden: () => void
  setWatchedPath: (path: string | null) => void
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  cwd: "",
  entries: [],
  expandedPaths: new Set(),
  showHidden: false,
  isLoading: false,
  watchedPath: null,

  setCwd: async (path) => {
    set({ cwd: path, isLoading: true })
    try {
      const { watchedPath } = get()
      if (watchedPath && watchedPath !== path) {
        await unwatchDir(watchedPath).catch(() => {})
      }
      const entries = await listDir(path, get().showHidden)
      await watchDir(path).catch(() => {})
      set({ entries, isLoading: false, watchedPath: path })
    } catch (e) {
      handleCommandError("Explorer.setCwd", e)
      set({ isLoading: false })
    }
  },

  refresh: async () => {
    const { cwd, showHidden } = get()
    if (!cwd) return
    try {
      const entries = await listDir(cwd, showHidden)
      set({ entries })
    } catch (e) {
      handleCommandError("Explorer.refresh", e)
    }
  },

  toggleExpanded: (path) =>
    set((state) => {
      const next = new Set(state.expandedPaths)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return { expandedPaths: next }
    }),

  toggleHidden: () =>
    set((state) => ({ showHidden: !state.showHidden })),

  setWatchedPath: (path) => set({ watchedPath: path }),
}))
