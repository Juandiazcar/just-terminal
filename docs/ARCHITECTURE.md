# ARCHITECTURE.md
# PSExplorer — PowerShell Explorer Terminal

**Version:** 1.1.0
**Audience:** Contributors and maintainers

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture (Rust)](#4-backend-architecture-rust)
5. [IPC Layer](#5-ipc-layer)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [State Management](#7-state-management)
8. [Terminal Subsystem Deep Dive](#8-terminal-subsystem-deep-dive)
9. [CWD Synchronization](#9-cwd-synchronization)
10. [Drag & Drop System](#10-drag--drop-system)
11. [Adding New Features](#11-adding-new-features)
12. [Error Handling](#12-error-handling)
13. [Code Style & Conventions](#13-code-style--conventions)
14. [Release Checklist](#14-release-checklist)

---

## 1. Philosophy

**Separation of concerns is non-negotiable.**
Rust backend owns all system operations. React frontend owns all UI. Neither reaches into the other's domain directly.

**IPC is the only bridge.**
Frontend never spawns processes or accesses native APIs directly. Everything goes through typed Tauri commands in `tauri-bridge.ts`.

**The terminal is a first-class citizen.**
Every architectural decision preserves terminal correctness. A broken ANSI sequence is more harmful than a missing UI feature.

**Fail gracefully, always.**
A crashed shell must not crash the app. Errors bubble to the user as readable toast notifications via `notification.store`.

**No premature abstraction.**
Rule of Three — abstract only when duplication appears three times.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  React Frontend (WebView2)                                        │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐  │
│  │ Terminal │ │ Explorer │ │   Git   │ │ Session  │ │Settings│  │
│  │ (xterm)  │ │(FileTree)│ │ Graph   │ │  Store   │ │ Store  │  │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ └────┬─────┘ └───┬────┘  │
│       └────────────┴────────────┴────────────┴───────────┘       │
│                               │                                   │
│                     ┌─────────▼──────────┐                        │
│                     │   tauri-bridge.ts  │  (typed invoke/listen) │
│                     └─────────┬──────────┘                        │
└───────────────────────────────┼──────────────────────────────────┘
                                │  Tauri IPC
┌───────────────────────────────┼──────────────────────────────────┐
│  Rust Backend                 │                                   │
│                     ┌─────────▼──────────┐                        │
│                     │     AppState       │  (Arc<Mutex<...>>)     │
│                     └─────────┬──────────┘                        │
│        ┌──────────┬───────────┴──────────┬────────────┐           │
│  ┌─────▼────┐ ┌───▼───┐  ┌──────────────▼─┐ ┌────────▼──────┐    │
│  │ Terminal │ │  FS   │  │      Git        │ │  Persistence  │    │
│  │ Manager  │ │  Ops  │  │  git2 + git_log │ │  (SQLite)     │    │
│  │(port-pty)│ │notify │  │  search_files   │ │               │    │
│  └─────┬────┘ └───────┘  └─────────────────┘ └───────────────┘    │
└────────┼───────────────────────────────────────────────────────────┘
         │  ConPTY
┌────────▼────────┐
│  powershell.exe │  (or CMD / Git Bash / WSL)
└─────────────────┘
```

### 2.1 Boundary Rules

| Rule | Rationale |
|---|---|
| Frontend never imports `fs`, `path`, or native modules | WebView2 is sandboxed |
| Rust commands return serializable types only | IPC via serde_json |
| Events fire-and-forget from Rust | Frontend subscribes; Rust never waits for UI |
| AppState is single source of truth for backend | No global mutable state outside AppState |
| HTML5 Drag & Drop API not used | WebView2 `dataTransfer.getData()` unreliable in `onDrop` |

---

## 3. Frontend Architecture

### 3.1 Component Tree

```
App
├── useKeyBindings()          — global keyboard shortcuts + zoom
├── useApplySettings()        — applies CSS vars and --app-zoom
├── useActiveTerminalSync()   — syncs explorer CWD on tab switch
└── MainLayout
    ├── Sidebar
    │   ├── [Tab: Explorer]
    │   │   ├── Favorites          (resizable section)
    │   │   ├── ── drag handle ──
    │   │   ├── FileTreeToolbar    (new file, new folder, search, refresh)
    │   │   ├── FileTree
    │   │   │   └── FileTreeNode (recursive)
    │   │   ├── ── drag handle ──
    │   │   └── RecentDirs         (resizable section)
    │   └── [Tab: Source Control]
    │       └── GitGraphPanel
    │           ├── GitStatusBar
    │           └── GitGraph       (SVG lane visualization)
    │
    ├── TerminalTabBar             (VERTICAL left panel, 192px wide)
    │   ├── TabItem × N            (pinnable, renameable, drag-reorderable)
    │   └── SettingsPanel          (Radix Dialog)
    │
    └── TerminalArea
        ├── TerminalTab (active)
        │   └── TerminalPane
        │       ├── xterm.js canvas
        │       └── DragOverlay    (shown during DragManager drag)
        └── EmptyState + DragDropZone
```

### 3.2 Component Responsibilities

**`TerminalPane`** renders one xterm.js instance. It also renders a transparent `DragOverlay` during folder drags (see §10). Logic lives in `useTerminal`.

**`GitGraph`** renders the full commit graph as a single SVG (not per-row SVGs). Uses a lane-assignment algorithm similar to `git log --graph` with cubic bezier curves for smooth branch/merge lines.

**`FileTreeToolbar`** manages `ExplorerUIStore` mode: `idle | new-file | new-folder | search`. Inline inputs replace `window.prompt()`. Search uses Rust `search_files` (recursive, max 60 results, debounced 250ms).

**`TerminalTabBar`** is a **vertical** 192px panel on the left of the terminal area. Tabs support: right-click context menu (Pin, Rename, Close), drag reorder via `onMouseDown` + `onMouseEnter`.

**`tauri-bridge.ts`** is the only file that calls `invoke()` and `listen()`.

### 3.3 Rule: Dumb Components, Smart Hooks

Components render. Hooks orchestrate. No `invoke()` calls inside components — only in hooks or via `tauri-bridge.ts`.

```typescript
// ✅ Correct
function TerminalPane({ terminalId, shell, initialCwd }) {
  const { containerRef, ptyIdRef } = useTerminal(terminalId, shell, initialCwd)
  return <div ref={containerRef} />
}
```

---

## 4. Backend Architecture (Rust)

### 4.1 Module Responsibilities

```
src-tauri/src/
├── main.rs          → entry point
├── lib.rs           → AppState init, all command registration, setup hook
├── state.rs         → AppState struct
├── terminal/
│   ├── pty_manager.rs   → spawn(shell, args, cwd, app), write, resize, kill
│   ├── session.rs       → PtySession struct (master, writer, child killer)
│   ├── shell_integration.rs → OSC 7 injection for bash/zsh/fish (macOS/Linux)
│   └── commands.rs      → create_terminal(shell, args, cwd, ...) etc.
├── platform/
│   ├── info.rs          → PlatformInfo: os, home dir, path separator, installed shells
│   └── commands.rs      → get_platform_info (called once at startup, stored in platform.store)
├── explorer/
│   ├── fs_ops.rs        → list_dir, create_file, delete_entry, search_files (recursive)
│   ├── watcher.rs       → FsWatcher with notify, emits "fs_change"
│   └── commands.rs
├── git/
│   ├── repository.rs    → get_status, get_log (CommitInfo with parents/refs), get_branches
│   ├── actions.rs       → fetch, pull, push, checkout, stash, stash_pop
│   └── commands.rs      → git_log(path, limit) added in v1.1
└── session/
    ├── persistence.rs   → SQLite save/load SessionSnapshot
    └── commands.rs
```

### 4.2 Key Change: `create_terminal` now accepts `args`

Shell profiles include startup args (including OSC 7 injection). The command signature is:

```rust
#[tauri::command]
pub async fn create_terminal(
    shell: String,
    args: Vec<String>,    // ← new in v1.1
    cwd: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<String, String>
```

### 4.3 New Commands in v1.1

| Command | Module | Purpose |
|---|---|---|
| `search_files` | `explorer` | Recursive file search (depth ≤ 8, max 60 results) |
| `git_log` | `git` | Returns `CommitInfo[]` with parents + refs for graph |

---

## 5. IPC Layer

### 5.1 tauri-bridge.ts — Actual Signatures

```typescript
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"   // ← listen is NOT in /core

// Terminal — shell args added in v1.1
export const createTerminal = (shell: string, args: string[], cwd: string) =>
  invoke<string>("create_terminal", { shell, args, cwd })

// Explorer — new in v1.1
export const searchFiles = (root: string, query: string) =>
  invoke<DirEntry[]>("search_files", { root, query })

// Git — new in v1.1
export const getGitLog = (path: string, limit?: number) =>
  invoke<CommitInfo[]>("git_log", { path, limit })
```

**Important:** `listen` must be imported from `@tauri-apps/api/event`, not `@tauri-apps/api/core`.

### 5.2 Tauri Capabilities

Capabilities live in `src-tauri/capabilities/default.json`. The `"capabilities": ["default"]` key must be present in `tauri.conf.json` under `app.security` or the permissions are not loaded.

Required permissions:
```json
{
  "permissions": [
    "core:default",
    "core:event:default",
    "core:event:allow-listen",
    "core:event:allow-unlisten",
    "core:event:allow-emit"
  ]
}
```

---

## 6. Data Flow Diagrams

### 6.1 User Types in Terminal

```
User keystroke
  → xterm.js onData(data)
    → useTerminal hook
      → writeInput(ptyId, data)        [tauri-bridge]
        → invoke("write_pty_input")    [IPC]
          → PtyManager.write_input()   [Rust]
            → PTY stdin                [OS]
              → powershell.exe         [Process]
```

### 6.2 Shell Output → Screen

```
powershell.exe writes stdout
  → PTY stdout pipe
    → PtyManager read loop (std::thread, 4KB chunks)
      → app.emit("pty_output_{id}", chunk)
        → onPtyOutput listener         [Frontend]
          → extractCwdFromOsc7(data)   [osc-parser.ts]
            → if CWD found: updateCwd + setCwd
          → term.write(data)           [xterm.js canvas]
```

### 6.3 User Drags Folder to Active Terminal

```
User holds mousedown on FileTreeNode (isDir=true)
  → DragManager.beginWatch(entry, x, y)   [lib/drag-manager.ts]
    → document mousemove listener starts
      → after 6px movement: DragManager active
        → notifies listeners via onStateChange()
          → TerminalPane shows DragOverlay   [z-index above xterm canvas]
          → MainLayout shows EmptyDropZone   [if no active terminal]

User releases mouseup over DragOverlay
  → DragOverlay.onMouseUp
    → DragManager.consume() → returns entry
      → writeInput(ptyId, `cd "${entry.path}"\r`)

User releases mouseup over EmptyDropZone
  → DragManager.consume() → returns entry
    → createTerminal(shell, args, entry.path)
      → addSession + setCwd
```

> **Note:** HTML5 Drag & Drop (`dataTransfer.getData`) is not used because WebView2 returns empty strings in `onDrop` handlers. The `DragManager` module uses native mouse events as a reliable alternative.

### 6.4 File System Change Detected

```
File changed on disk
  → notify watcher (Rust)
    → app.emit("fs_change", FsChangeEvent)
      → useFileWatcher hook
        → explorerStore.refresh()
          → FileTree re-renders
```

### 6.5 Tab Switch → Explorer Sync

```
User clicks different terminal tab
  → setActive(id)                      [terminals.store]
    → useActiveTerminalSync useEffect fires
      → reads sessions[activeId].cwd
        → explorerStore.setCwd(cwd)
          → FileTree shows new directory
```

---

## 7. State Management

### 7.1 Store Breakdown

| Store | Owns |
|---|---|
| `terminals.store` | sessions, order[], activeId, splits, pinned state |
| `explorer.store` | cwd, entries, expandedPaths, showHidden, watchedPath |
| `explorer-ui.store` | mode (idle/new-file/new-folder/search), searchQuery |
| `git.store` | statusByPath, logByPath (commit graph data) |
| `session.store` | favorites[], recentDirs[], quickCommands[], sidebarWidth, theme |
| `settings.store` | fontSize, fontFamily, zoom, activeThemeName, customVars |
| `notification.store` | toast notifications (5s auto-dismiss) |

### 7.2 New: terminals.store additions (v1.1)

```typescript
interface TerminalsState {
  sessions: Record<string, TerminalSession>
  order: string[]          // display order (separate from sessions object key order)
  activeId: string | null

  togglePin: (id: string) => void      // sets session.pinned
  renameTab: (id: string, title: string) => void
  reorder: (dragId: string, dropId: string | null) => void
}
```

Rendering order: pinned sessions always first, then unpinned in `order[]` sequence.

### 7.3 Rules

- Stores hold UI state only. No PTY buffers, no file blobs.
- Cross-store coordination goes in hooks (`useActiveTerminalSync`, `useGitStatus`, etc.) — not in stores.
- Async operations live in hooks. Stores are synchronous.

---

## 8. Terminal Subsystem Deep Dive

### 8.1 PTY Lifecycle

The PTY is created **once in `App.tsx`** via `openInitialTerminal()`, not inside `useTerminal`. This is critical — `useTerminal` connects to an existing PTY using `terminalId` as the PTY ID directly.

```
App.tsx openInitialTerminal():
  → createTerminal(shell.executable, shell.args, cwd)   [IPC → Rust]
    → PtyManager.spawn(shell, args, cwd, app)
      → builds CommandBuilder with args
      → opens ConPTY pair
      → spawns shell process
      → starts read loop thread
      → returns uuid as session ID
  → addSession(makeSession(id, shell, cwd))             [Zustand]

TerminalPane mounts with terminalId = id:
  → useTerminal(terminalId, shell, initialCwd)
    → ptyIdRef.current = terminalId    ← uses existing PTY, does NOT create new one
    → opens xterm.js canvas
    → registers onPtyOutput listener
    → wires term.onData → writeInput(ptyIdRef.current, data)
```

**StrictMode guard**: `App.tsx` uses `sessionInitialized = useRef(false)` to prevent double-invocation of session restore in React 18 StrictMode dev mode.

### 8.2 OSC 7 Injection — Shell Args Approach

OSC 7 is **not** injected via `writeInput` after shell start (that caused the function definition to be echoed visibly). Instead, it is passed as a `-Command` startup argument:

```typescript
// lib/shell-profiles.ts
const PS_OSC7_CMD =
  `$function:prompt={$p=$ExecutionContext.SessionState.Path.CurrentLocation.Path;` +
  `[Console]::Write([string][char]27+"]7;file://localhost/"+$p.Replace('\\','/')+[string][char]7);"PS $p> "}`

export const SHELL_PROFILES = [
  {
    name: "PowerShell",
    executable: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    args: ["-NoLogo", "-NoExit", "-Command", PS_OSC7_CMD],
  },
  // ...
]
```

PowerShell executes the `-Command` silently before entering interactive mode — no echo, no `>>` continuation prompts.

### 8.2.1 Cross-platform (Windows / macOS / Linux)

- **Platform facts come from Rust.** `get_platform_info` runs before session restore in `App.tsx`; `lib/platform.ts` exposes sync helpers (`getDefaultCwd`, `joinPath`, `splitPath`, `cdCommand`, `hasPrimaryModifier`). Never hardcode `C:\\`, `\\` or `e.ctrlKey` in components.
- **Shell profiles:** Windows uses the static list in `shell-profiles.ts`; macOS/Linux build profiles from `/etc/shells` and default to `$SHELL`.
- **OSC 7 on POSIX** is injected by the backend (`shell_integration.rs`): `PROMPT_COMMAND` for bash, a `ZDOTDIR` shim for zsh (user config is still sourced), `--init-command` for fish. PowerShell keeps the `-Command` arg approach on every OS.
- **Shortcuts:** the "primary" modifier is Cmd on macOS, Ctrl elsewhere. Tab switching uses literal Ctrl.
- **Linux build deps:** `webkit2gtk-4.1`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `perl`.

### 8.2.2 Performance & memory rules

- PTY reader: 32 KB reusable buffer, UTF-8 sequences split across reads are carried over (no U+FFFD), 256 KB thread stack.
- Process exit: the reader thread reaps the child, reports the real exit code and removes the session (no leaked FDs/zombies). `kill_terminal` kills the child explicitly.
- xterm: WebGL renderer (DOM fallback), scrollback 5000 lines (`DEFAULT_SCROLLBACK`).
- The fs watcher is **non-recursive** (the explorer only lists one level) and the frontend debounces refreshes.
- OSC 7 handling is skipped unless the chunk contains the OSC 7 prefix, and store updates only fire when the cwd changes.

### 8.3 Resize Handling

```typescript
const handleResize = useCallback(() => {
  fitRef.current?.fit()
  const { cols, rows } = termRef.current!
  resizePty(ptyIdRef.current, cols, rows).catch(() => {})
}, [])

useEffect(() => {
  const observer = new ResizeObserver(handleResize)
  observer.observe(containerRef.current!)
  return () => observer.disconnect()
}, [handleResize])
```

### 8.4 PTY Kill Logic

`useTerminal` cleanup calls `killTerminal` **only when the session no longer exists in the store** (real unmount). In React StrictMode, the cleanup runs but the session still exists → no kill → PTY survives the re-mount cycle.

```typescript
return () => {
  term.dispose()
  const sessionGone = !useTerminalsStore.getState().sessions[terminalId]
  if (sessionGone) killTerminal(ptyIdRef.current).catch(() => {})
}
```

---

## 9. CWD Synchronization

### 9.1 Mechanism

1. Shell startup: OSC 7 prompt function injected via `-Command` arg (see §8.2)
2. On every prompt display, shell emits: `ESC]7;file://localhost/C:/path\x07`
3. `useTerminal` parses this before passing data to `term.write()`
4. On detection: `updateCwd(terminalId, cwd)` + `explorerStore.setCwd(cwd)`

### 9.2 Tab Switch Sync

`useActiveTerminalSync` hook in `App.tsx` reacts to `activeId` changes and calls `explorerStore.setCwd(sessions[activeId].cwd)`. New terminals always start at `C:\` — they do not inherit the previous terminal's CWD.

### 9.3 Explorer → Terminal Navigation

Clicking a Favorite or Recent directory calls `writeInput(activeId, 'cd "path"\r')` to navigate the active terminal. The resulting OSC 7 from the next prompt confirms the navigation in the file tree.

Folders in the FileTree expand/collapse on single click. **Double-click does NOT cd** — use drag & drop instead (see §10).

---

## 10. Drag & Drop System

HTML5 DnD is not used. `DragManager` (`lib/drag-manager.ts`) implements drag via mouse events.

### 10.1 DragManager

```typescript
// Singleton module
DragManager.beginWatch(entry, mouseX, mouseY)
// → adds document mousemove/mouseup listeners
// → activates after 6px movement
// → notifies via onStateChange(entry | null)

DragManager.consume()
// → returns current entry and clears state
// → triggers onStateChange(null) to hide overlays
```

### 10.2 Drop Zones

| Zone | Component | Action |
|---|---|---|
| Active terminal | `TerminalPane` DragOverlay | `writeInput(ptyId, 'cd "path"\r')` |
| Empty terminal area | `MainLayout` EmptyDropZone | `createTerminal(shell, args, entry.path)` |

Only **folders** (`entry.isDir === true`) can be dropped. Files are not draggable (`draggable={entry.isDir}`).

### 10.3 Why Not HTML5 DnD

WebView2 (Tauri's renderer on Windows) does not reliably return `dataTransfer.getData()` in `onDrop` handlers — the value is always an empty string. Mouse-event-based drag is the correct approach for in-app DnD in Tauri on Windows.

---

## 11. Adding New Features

### 11.1 Adding a New Sidebar Panel

1. Create `src/components/sidebar/MyPanel.tsx` — reads from store, no direct IPC
2. If backend data needed: Rust command → register in `lib.rs` → `tauri-bridge.ts` wrapper → Zustand store → hook
3. Add to `Sidebar.tsx` tab content

### 11.2 Adding a Keyboard Shortcut

1. Add to `useKeyBindings.ts` bindings array: `{ ctrl: true, key: "x", action: () => ... }`
2. Document in SRS shortcuts table

### 11.3 Adding a New Shell Profile

Shell profiles are data in `lib/shell-profiles.ts`. For shells that support OSC 7, include the injection in `args`. For CMD/WSL, omit it.

---

## 12. Error Handling

### 12.1 Rust Commands

All return `Result<T, String>`. Human-readable error strings:
```rust
.map_err(|e| format!("Failed to open repo at {}: {}", path, e))
```

### 12.2 Frontend

`handleCommandError(context, error)` in `lib/error-handler.ts` logs and dispatches to `notification.store` (toast). Never let a failed `invoke` silently disappear.

### 12.3 Terminal Process Exit

Rust emits `terminal_closed_{id}`. `useTerminal` displays: `"Process exited with code X. Press any key to restart."` On keypress, `createTerminal` is called with the same shell/args and the session's last known CWD.

---

## 13. Code Style & Conventions

### 13.1 TypeScript

- Strict mode, no `any`
- `kebab-case.ts` for utilities/hooks, `PascalCase.tsx` for components
- Named exports, one component per file
- No barrel `index.ts` files

### 13.2 Rust

- `rustfmt` defaults
- `clippy` warnings = errors in CI
- `anyhow::Result` internally; `String` only at command boundary
- No `unwrap()`/`expect()` outside tests

### 13.3 CSS / Theming

All colors use HSL CSS variables: `hsl(var(--foreground))`. Variable definitions live in `src/styles/themes/dark.css` and `light.css`. Custom user overrides go through `settings.store.customVars` applied via `useApplySettings`.

Global zoom via `--app-zoom` on `#root`:
```css
#root {
  width: calc(100vw / var(--app-zoom, 1));
  height: calc(100vh / var(--app-zoom, 1));
  transform: scale(var(--app-zoom, 1));
  transform-origin: top left;
}
```
Keyboard: `Ctrl+=` zoom in, `Ctrl+-` zoom out, `Ctrl+0` reset.

---

## 14. Release Checklist

**Code Quality**
- [ ] `pnpm lint` passes
- [ ] `cargo clippy -- -D warnings` passes
- [ ] All tests pass (`pnpm test`, `cargo test`)

**Functionality**
- [ ] Terminal spawns correctly (PowerShell, CMD)
- [ ] OSC 7 CWD sync works (navigate in terminal → explorer updates)
- [ ] Tab switch → explorer updates to that terminal's CWD
- [ ] Drag folder → active terminal: executes `cd`
- [ ] Drag folder → empty area: opens new terminal at that path
- [ ] Git graph renders for repos with branches/merges
- [ ] File search (recursive) returns correct results
- [ ] Session restores after close/reopen
- [ ] Zoom Ctrl+= / Ctrl+- / Ctrl+0 works and is responsive
- [ ] App exits cleanly, no orphan processes

**Build**
- [ ] `pnpm tauri build` succeeds
- [ ] Tested on Windows 10 (build 1903+) and Windows 11
