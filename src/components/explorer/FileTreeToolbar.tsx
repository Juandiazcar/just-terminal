import { useRef, KeyboardEvent } from "react"
import { FilePlus, FolderPlus, Search, RefreshCw, X } from "lucide-react"
import { useExplorerStore } from "@/store/explorer.store"
import { useExplorerUIStore } from "@/store/explorer-ui.store"
import { createFile, createDir } from "@/lib/tauri-bridge"
import { handleCommandError } from "@/lib/error-handler"
import { cn } from "@/lib/utils"

export function FileTreeToolbar() {
  const { cwd, refresh } = useExplorerStore()
  const { mode, searchQuery, setMode, setSearchQuery, reset } = useExplorerUIStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCommit = async (value: string) => {
    if (!value.trim() || !cwd) { reset(); return }
    const path = `${cwd}\\${value.trim()}`
    if (mode === "new-file") {
      await createFile(path).catch((e) => handleCommandError("FileTree.newFile", e))
    } else if (mode === "new-folder") {
      await createDir(path).catch((e) => handleCommandError("FileTree.newFolder", e))
    }
    reset()
    refresh()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleCommit(e.currentTarget.value)
    if (e.key === "Escape") reset()
  }

  const activateMode = (m: typeof mode) => {
    setMode(mode === m ? "idle" : m)
    if (m !== "idle") setTimeout(() => inputRef.current?.focus(), 0)
  }

  const dirName = cwd?.split(/[/\\]/).filter(Boolean).pop() ?? "Explorer"

  return (
    <div className="flex-shrink-0" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
      {/* Header row */}
      <div className="flex items-center px-2 py-1.5 gap-1">
        <span
          className="flex-1 text-xs font-medium truncate"
          style={{ color: "hsl(var(--foreground))" }}
          title={cwd ?? ""}
        >
          {dirName}
        </span>

        {/* Action buttons */}
        {(
          [
            { icon: FilePlus, m: "new-file", title: "New File" },
            { icon: FolderPlus, m: "new-folder", title: "New Folder" },
            { icon: Search, m: "search", title: "Search" },
            { icon: RefreshCw, m: "idle", title: "Refresh", onClick: refresh },
          ] as const
        ).map(({ icon: Icon, m, title, onClick }) => (
          <button
            key={title}
            title={title}
            onClick={onClick ?? (() => activateMode(m as typeof mode))}
            className={cn(
              "p-1 rounded transition-colors",
              mode === m && m !== "idle"
                ? "text-primary bg-primary/10"
                : "hover:bg-white/10"
            )}
            style={{
              color:
                mode === m && m !== "idle"
                  ? "hsl(var(--primary))"
                  : "hsl(var(--muted-foreground))",
            }}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>

      {/* Inline new-file / new-folder input */}
      {(mode === "new-file" || mode === "new-folder") && (
        <div className="flex items-center gap-1 px-2 pb-1.5">
          <span className="text-xs opacity-40" style={{ color: "hsl(var(--muted-foreground))" }}>
            {mode === "new-file" ? "📄" : "📁"}
          </span>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            className="flex-1 text-xs bg-transparent outline-none border-b pb-0.5"
            style={{
              borderColor: "hsl(var(--primary))",
              color: "hsl(var(--foreground))",
              caretColor: "hsl(var(--primary))",
            }}
            placeholder={mode === "new-file" ? "filename.ext" : "folder-name"}
            onKeyDown={handleKeyDown}
            onBlur={(e) => handleCommit(e.currentTarget.value)}
          />
          <button onClick={reset} className="opacity-40 hover:opacity-80">
            <X size={13} style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>
      )}

      {/* Search input */}
      {mode === "search" && (
        <div className="flex items-center gap-1 px-2 pb-1.5">
          <Search size={13} style={{ color: "hsl(var(--muted-foreground))" }} className="flex-shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            className="flex-1 text-xs bg-transparent outline-none border-b pb-0.5"
            style={{
              borderColor: "hsl(var(--primary))",
              color: "hsl(var(--foreground))",
              caretColor: "hsl(var(--primary))",
            }}
            placeholder="Filter files…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && reset()}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="opacity-40 hover:opacity-80">
              <X size={13} style={{ color: "hsl(var(--muted-foreground))" }} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
