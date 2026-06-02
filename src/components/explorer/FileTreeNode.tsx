import { useState } from "react"
import { ChevronRight } from "lucide-react"
import type { DirEntry } from "@/types/explorer.types"
import { useExplorerStore } from "@/store/explorer.store"
import { listDir } from "@/lib/tauri-bridge"
import { ContextMenu } from "./ContextMenu"
import { handleCommandError } from "@/lib/error-handler"
import { DragManager } from "@/lib/drag-manager"
import { cn } from "@/lib/utils"

function fileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  const map: Record<string, string> = {
    ts: "#3b82f6", tsx: "#3b82f6", js: "#f59e0b", jsx: "#f59e0b",
    json: "#f59e0b", md: "#a78bfa", css: "#38bdf8", scss: "#f472b6",
    html: "#fb923c", rs: "#f97316", py: "#34d399", go: "#22d3ee",
    sh: "#4ade80", bash: "#4ade80", env: "#facc15", yml: "#facc15",
    yaml: "#facc15", toml: "#fb923c", gitignore: "#f87171",
    lock: "#94a3b8", png: "#e879f9", jpg: "#e879f9", svg: "#e879f9",
    gif: "#e879f9",
  }
  return map[ext] ?? "hsl(var(--muted-foreground))"
}

function FolderIcon({ name, open }: { name: string; open: boolean }) {
  const special: Record<string, string> = {
    src: "#7c9dff", components: "#a78bfa", pages: "#60a5fa",
    hooks: "#34d399", store: "#f59e0b", lib: "#38bdf8", utils: "#38bdf8",
    types: "#818cf8", styles: "#f472b6", assets: "#e879f9",
    "node_modules": "#6b7280", ".git": "#f87171", dist: "#94a3b8",
    public: "#4ade80", test: "#fb923c", tests: "#fb923c",
  }
  const color = special[name.toLowerCase()] ?? (open ? "#7c9dff" : "hsl(var(--muted-foreground))")
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      {open ? (
        <path d="M1 4a1 1 0 011-1h4l1.5 2H14a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" fill={color} fillOpacity="0.9" />
      ) : (
        <>
          <path d="M1 5a1 1 0 011-1h5l1.5 2H14a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V5z" fill={color} fillOpacity="0.7" />
          <path d="M1 4a1 1 0 011-1h4.5l1 1.5H1V4z" fill={color} fillOpacity="0.5" />
        </>
      )}
    </svg>
  )
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  const color = fileColor(name)
  const label = ext.slice(0, 2).toUpperCase()
  return (
    <svg width="15" height="17" viewBox="0 0 14 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 1h7l3 3v10a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z" fill={color} fillOpacity="0.15" stroke={color} strokeOpacity="0.6" strokeWidth="1" />
      <path d="M9 1l3 3H9V1z" fill={color} fillOpacity="0.4" />
      {label && (
        <text x="2.5" y="11.5" fontSize="5" fill={color} fontFamily="monospace" fontWeight="bold">
          {label}
        </text>
      )}
    </svg>
  )
}

interface Props {
  entry: DirEntry
  depth?: number
}

export function FileTreeNode({ entry, depth = 0 }: Props) {
  const [childEntries, setChildEntries] = useState<DirEntry[]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const { expandedPaths, toggleExpanded } = useExplorerStore()
  const isExpanded = expandedPaths.has(entry.path)

  const handleClick = async () => {
    if (!entry.isDir) return
    toggleExpanded(entry.path)
    if (!isExpanded && childEntries.length === 0) {
      try {
        const entries = await listDir(entry.path)
        setChildEntries(entries)
      } catch (e) {
        handleCommandError("FileTree.expand", e)
      }
    }
  }

  const handleDoubleClick = () => {}

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-2 py-1.5 cursor-pointer select-none rounded-sm mx-1 transition-colors hover:bg-white/5"
        )}
        style={{
          paddingLeft: `${8 + depth * 14}px`,
          paddingRight: "8px",
          opacity: entry.isHidden ? 0.45 : 1,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY })
        }}
        onMouseDown={
          entry.isDir
            ? (e) => {
                if (e.button !== 0) return
                e.preventDefault()
                DragManager.beginWatch(entry, e.clientX, e.clientY)
              }
            : undefined
        }
      >
        {entry.isDir ? (
          <>
            <ChevronRight
              size={13}
              className="flex-shrink-0 transition-transform duration-100"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                color: "hsl(var(--muted-foreground))",
                opacity: 0.6,
              }}
            />
            <FolderIcon name={entry.name} open={isExpanded} />
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            <FileIcon name={entry.name} />
          </>
        )}
        <span
          className="truncate text-sm leading-none"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {entry.name}
        </span>
      </div>

      {entry.isDir && isExpanded && childEntries.map((child) => (
        <FileTreeNode key={child.path} entry={child} depth={depth + 1} />
      ))}

      {contextMenu && (
        <ContextMenu
          entry={entry}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
