import { create } from "zustand"
import type { QuickCommand } from "@/types/session.types"

interface SessionState {
  favorites: string[]
  recentDirs: string[]
  quickCommands: QuickCommand[]
  sidebarWidth: number
  theme: "dark" | "light"

  addFavorite: (path: string) => void
  removeFavorite: (path: string) => void
  pushRecentDir: (path: string) => void
  addQuickCommand: (cmd: QuickCommand) => void
  removeQuickCommand: (id: string) => void
  setSidebarWidth: (w: number) => void
  setTheme: (theme: "dark" | "light") => void
}

const MAX_RECENT = 20

export const useSessionStore = create<SessionState>((set) => ({
  favorites: [],
  recentDirs: [],
  quickCommands: [],
  sidebarWidth: 260,
  theme: "dark",

  addFavorite: (path) =>
    set((state) =>
      state.favorites.includes(path)
        ? state
        : { favorites: [...state.favorites, path] }
    ),

  removeFavorite: (path) =>
    set((state) => ({ favorites: state.favorites.filter((f) => f !== path) })),

  pushRecentDir: (path) =>
    set((state) => {
      const filtered = state.recentDirs.filter((d) => d !== path)
      return { recentDirs: [path, ...filtered].slice(0, MAX_RECENT) }
    }),

  addQuickCommand: (cmd) =>
    set((state) => ({ quickCommands: [...state.quickCommands, cmd] })),

  removeQuickCommand: (id) =>
    set((state) => ({
      quickCommands: state.quickCommands.filter((c) => c.id !== id),
    })),

  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),

  setTheme: (theme) => set({ theme }),
}))
