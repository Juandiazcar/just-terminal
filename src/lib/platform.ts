import { usePlatformStore } from "@/store/platform.store"
import type { PlatformInfo, PlatformOs } from "@/types/platform.types"

// Used only until the backend answers (first paint); the backend value always wins.
function guessOs(): PlatformOs {
  const ua = navigator.userAgent
  if (ua.includes("Windows")) return "windows"
  if (ua.includes("Mac")) return "macos"
  return "linux"
}

export function getPlatform(): PlatformInfo {
  const info = usePlatformStore.getState().info
  if (info) return info
  const os = guessOs()
  return {
    os,
    homeDir: os === "windows" ? "C:\\" : "/",
    pathSeparator: os === "windows" ? "\\" : "/",
    defaultShell: null,
    shells: [],
  }
}

export const isWindows = () => getPlatform().os === "windows"
export const isMac = () => getPlatform().os === "macos"

// Windows keeps its historical drive-root start; Unix starts in the user's home.
export function getDefaultCwd(): string {
  const { os, homeDir } = getPlatform()
  return os === "windows" ? "C:\\" : homeDir
}

export function splitPath(path: string): string[] {
  return path.split(/[/\\]/).filter(Boolean)
}

export function joinPath(base: string, name: string): string {
  const sep = getPlatform().pathSeparator
  return base.endsWith(sep) ? `${base}${name}` : `${base}${sep}${name}`
}

// Rebuilds an absolute path from the first `count` segments of splitPath().
export function pathFromParts(parts: string[], count: number): string {
  const sliced = parts.slice(0, count)
  if (isWindows()) {
    return sliced.length === 1 && sliced[0].endsWith(":") ? `${sliced[0]}\\` : sliced.join("\\")
  }
  return `/${sliced.join("/")}`
}

// Shell command that changes directory, quoted for the active platform's shells.
export function cdCommand(path: string): string {
  if (isWindows()) return `cd "${path}"\r`
  return `cd '${path.replace(/'/g, `'\\''`)}'\r`
}

// "Primary" shortcut modifier: Cmd on macOS, Ctrl elsewhere.
export function hasPrimaryModifier(e: KeyboardEvent): boolean {
  return isMac() ? e.metaKey : e.ctrlKey
}
