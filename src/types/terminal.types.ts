export type ShellProfile = {
  name: string
  executable: string
  args: string[]
  env?: Record<string, string>
}

export interface TerminalSession {
  id: string
  shell: ShellProfile
  cwd: string
  title: string
  createdAt: number
  pinned?: boolean
}

export interface SplitConfig {
  direction: "horizontal" | "vertical" | null
  paneIds: [string, string] | null
}

export const DEFAULT_SHELL: ShellProfile = {
  name: "PowerShell",
  executable: "pwsh.exe",
  args: [],
}
