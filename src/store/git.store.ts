import { create } from "zustand"
import type { CommitInfo, GitStatus } from "@/types/git.types"

interface GitState {
  statusByPath: Record<string, GitStatus>
  logByPath: Record<string, CommitInfo[]>
  setStatus: (path: string, status: GitStatus) => void
  setLog: (path: string, commits: CommitInfo[]) => void
  clearStatus: (path: string) => void
}

export const useGitStore = create<GitState>((set) => ({
  statusByPath: {},
  logByPath: {},

  setStatus: (path, status) =>
    set((state) => ({
      statusByPath: { ...state.statusByPath, [path]: status },
    })),

  setLog: (path, commits) =>
    set((state) => ({
      logByPath: { ...state.logByPath, [path]: commits },
    })),

  clearStatus: (path) =>
    set((state) => {
      const { [path]: _, ...rest } = state.statusByPath
      return { statusByPath: rest }
    }),
}))
