import { create } from "zustand"
import type { ShellProfile, SplitConfig, TerminalSession } from "@/types/terminal.types"

interface TerminalsState {
  sessions: Record<string, TerminalSession>
  order: string[]
  activeId: string | null
  splits: Record<string, SplitConfig>

  addSession: (session: TerminalSession) => void
  removeSession: (id: string) => void
  setActive: (id: string) => void
  updateCwd: (id: string, cwd: string) => void
  renameTab: (id: string, title: string) => void
  togglePin: (id: string) => void
  reorder: (dragId: string, dropId: string | null) => void
  setSplit: (id: string, config: SplitConfig) => void
  removeSplit: (id: string) => void
}

export const useTerminalsStore = create<TerminalsState>((set) => ({
  sessions: {},
  order: [],
  activeId: null,
  splits: {},

  addSession: (session) =>
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: session },
      order: [...state.order, session.id],
      activeId: session.id,
    })),

  removeSession: (id) =>
    set((state) => {
      const { [id]: _s, ...rest } = state.sessions
      const { [id]: _sp, ...restSplits } = state.splits
      const newOrder = state.order.filter((o) => o !== id)
      const newActive =
        state.activeId === id ? (newOrder[newOrder.length - 1] ?? null) : state.activeId
      return { sessions: rest, splits: restSplits, order: newOrder, activeId: newActive }
    }),

  setActive: (id) => set({ activeId: id }),

  updateCwd: (id, cwd) =>
    set((state) => ({
      sessions: { ...state.sessions, [id]: { ...state.sessions[id], cwd } },
    })),

  renameTab: (id, title) =>
    set((state) => ({
      sessions: { ...state.sessions, [id]: { ...state.sessions[id], title } },
    })),

  togglePin: (id) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [id]: { ...state.sessions[id], pinned: !state.sessions[id]?.pinned },
      },
    })),

  // Move dragId to the position before dropId (or to end if dropId is null)
  reorder: (dragId, dropId) =>
    set((state) => {
      const without = state.order.filter((o) => o !== dragId)
      if (!dropId) return { order: [...without, dragId] }
      const idx = without.indexOf(dropId)
      without.splice(idx, 0, dragId)
      return { order: without }
    }),

  setSplit: (id, config) =>
    set((state) => ({ splits: { ...state.splits, [id]: config } })),

  removeSplit: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.splits
      return { splits: rest }
    }),
}))

export function makeSession(id: string, shell: ShellProfile, cwd: string): TerminalSession {
  return { id, shell, cwd, title: shell.name, createdAt: Date.now() }
}
