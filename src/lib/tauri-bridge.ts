import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import type { DirEntry, FsChangeEvent } from "@/types/explorer.types"
import type { CommitInfo, GitStatus } from "@/types/git.types"
import type { SessionSnapshot } from "@/types/session.types"

export type UnlistenFn = () => void

// ── Terminal ──────────────────────────────────────────────────────────────────

export const createTerminal = (shell: string, args: string[], cwd: string) =>
  invoke<string>("create_terminal", { shell, args, cwd })

export const writeInput = (id: string, data: string) =>
  invoke<void>("write_pty_input", { id, data })

export const resizePty = (id: string, cols: number, rows: number) =>
  invoke<void>("resize_pty", { id, cols, rows })

export const killTerminal = (id: string) => invoke<void>("kill_terminal", { id })

export const setTerminalCwd = (id: string, cwd: string) =>
  invoke<void>("set_terminal_cwd", { id, cwd })

export const onPtyOutput = (
  id: string,
  cb: (data: string) => void
): Promise<UnlistenFn> => listen<string>(`pty_output_${id}`, (e) => cb(e.payload))

export const onTerminalClosed = (
  id: string,
  cb: (code: number) => void
): Promise<UnlistenFn> => listen<number>(`terminal_closed_${id}`, (e) => cb(e.payload))

// ── Explorer ──────────────────────────────────────────────────────────────────

export const listDir = (path: string, showHidden?: boolean) =>
  invoke<DirEntry[]>("list_dir", { path, showHidden })

export const searchFiles = (root: string, query: string) =>
  invoke<DirEntry[]>("search_files", { root, query })

export const createFile = (path: string) => invoke<void>("create_file", { path })

export const createDir = (path: string) => invoke<void>("create_dir", { path })

export const renameEntry = (from: string, to: string) =>
  invoke<void>("rename_entry", { from, to })

export const deleteEntry = (path: string, recursive: boolean) =>
  invoke<void>("delete_entry", { path, recursive })

export const copyEntry = (from: string, to: string) =>
  invoke<void>("copy_entry", { from, to })

export const watchDir = (path: string) => invoke<void>("watch_dir", { path })

export const unwatchDir = (path: string) => invoke<void>("unwatch_dir", { path })

export const onFsChange = (cb: (event: FsChangeEvent) => void): Promise<UnlistenFn> =>
  listen<FsChangeEvent>("fs_change", (e) => cb(e.payload))

// ── Git ───────────────────────────────────────────────────────────────────────

export const getGitStatus = (path: string) =>
  invoke<GitStatus>("git_status", { path })

export const getGitLog = (path: string, limit?: number) =>
  invoke<CommitInfo[]>("git_log", { path, limit })

export const gitFetch = (path: string) => invoke<void>("git_fetch", { path })

export const gitPull = (path: string) => invoke<void>("git_pull", { path })

export const gitPush = (path: string) => invoke<void>("git_push", { path })

export const gitCheckout = (path: string, branch: string) =>
  invoke<void>("git_checkout", { path, branch })

export const gitBranches = (path: string) =>
  invoke<string[]>("git_branches", { path })

export const gitStash = (path: string) => invoke<void>("git_stash", { path })

export const gitStashPop = (path: string) => invoke<void>("git_stash_pop", { path })

export const onGitStatusChanged = (
  cb: (status: GitStatus) => void
): Promise<UnlistenFn> =>
  listen<GitStatus>("git_status_changed", (e) => cb(e.payload))

// ── Session ───────────────────────────────────────────────────────────────────

export const saveSession = (session: SessionSnapshot) =>
  invoke<void>("save_session", { session })

export const loadSession = () => invoke<SessionSnapshot | null>("load_session", {})
