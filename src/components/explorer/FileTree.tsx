import { useEffect, useState } from "react"
import { File, Folder } from "lucide-react"
import { useExplorerStore } from "@/store/explorer.store"
import { useExplorerUIStore } from "@/store/explorer-ui.store"
import { searchFiles } from "@/lib/tauri-bridge"
import { FileTreeNode } from "./FileTreeNode"
import type { DirEntry } from "@/types/explorer.types"

export function FileTree() {
  const { entries, isLoading, cwd } = useExplorerStore()
  const { searchQuery } = useExplorerUIStore()
  const [searchResults, setSearchResults] = useState<DirEntry[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!searchQuery.trim() || !cwd) {
      setSearchResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(() => {
      searchFiles(cwd, searchQuery.trim())
        .then((results) => {
          setSearchResults(results)
          setSearching(false)
        })
        .catch(() => setSearching(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery, cwd])

  if (!cwd) {
    return (
      <div className="px-3 py-3 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        No folder open
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="px-3 py-3 text-xs animate-pulse" style={{ color: "hsl(var(--muted-foreground))" }}>
        Loading…
      </div>
    )
  }

  if (searchQuery.trim()) {
    if (searching) {
      return (
        <div className="px-3 py-3 text-xs animate-pulse" style={{ color: "hsl(var(--muted-foreground))" }}>
          Searching…
        </div>
      )
    }
    if (searchResults.length === 0) {
      return (
        <div className="px-3 py-3 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          No results for "{searchQuery}"
        </div>
      )
    }
    return (
      <div className="flex flex-col overflow-y-auto">
        {searchResults.map((entry) => (
          <div
            key={entry.path}
            className="flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-white/5 cursor-default"
            style={{ color: "hsl(var(--foreground))" }}
            title={entry.path}
          >
            {entry.isDir ? (
              <Folder size={13} style={{ color: "hsl(var(--primary))", flexShrink: 0 }} />
            ) : (
              <File size={13} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
            )}
            <div className="min-w-0">
              <div className="truncate">{entry.name}</div>
              <div
                className="truncate text-[10px]"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                {entry.path.slice(cwd.length + 1)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      {entries.map((entry) => (
        <FileTreeNode key={entry.path} entry={entry} />
      ))}
    </div>
  )
}
