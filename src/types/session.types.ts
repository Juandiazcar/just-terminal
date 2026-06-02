import type { ShellProfile } from "./terminal.types"

export interface PaneSnapshot {
  shell: ShellProfile
  cwd: string
}

export interface SplitSnapshot {
  direction: "horizontal" | "vertical" | null
  panes: PaneSnapshot[]
}

export interface TabSnapshot {
  id: string
  title: string
  shell: ShellProfile
  cwd: string
  splits: SplitSnapshot[]
}

export interface QuickCommand {
  id: string
  label: string
  command: string
}

export interface SessionSnapshot {
  tabs: TabSnapshot[]
  activeTabId: string
  sidebarWidth: number
  favorites: string[]
  recentDirs: string[]
  quickCommands: QuickCommand[]
  theme: "dark" | "light"
}
