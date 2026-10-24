export type PlatformOs = "windows" | "macos" | "linux"

export interface PlatformInfo {
  os: PlatformOs
  homeDir: string
  pathSeparator: string
  defaultShell: string | null
  shells: string[]
}
