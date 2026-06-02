import { useSessionStore } from "@/store/session.store"
import { useExplorerStore } from "@/store/explorer.store"
import { useTerminalsStore } from "@/store/terminals.store"
import { writeInput } from "@/lib/tauri-bridge"

function FolderIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 5a1 1 0 011-1h5l1.5 2H14a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V5z" fill="#38bdf8" fillOpacity="0.75" />
      <path d="M1 4a1 1 0 011-1h4.5l1 1.5H1V4z" fill="#38bdf8" fillOpacity="0.45" />
    </svg>
  )
}

export function RecentDirs() {
  const recentDirs = useSessionStore((s) => s.recentDirs)
  const setCwd = useExplorerStore((s) => s.setCwd)
  const activeId = useTerminalsStore((s) => s.activeId)

  const navigate = (path: string) => {
    setCwd(path).catch(() => {})
    if (activeId) writeInput(activeId, `cd "${path}"\r`).catch(() => {})
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center px-3 py-2 flex-shrink-0 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
          Recent
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {recentDirs.length === 0 ? (
          <p className="px-3 py-3 text-sm opacity-50" style={{ color: "hsl(var(--muted-foreground))" }}>
            No recent folders
          </p>
        ) : (
          recentDirs.map((path) => {
            const parts = path.split(/[/\\]/).filter(Boolean)
            const name = parts.at(-1) ?? path
            const parent = parts.at(-2)
            return (
              <button
                key={path}
                className="group w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 transition-colors"
                title={path}
                onClick={() => navigate(path)}
              >
                <FolderIcon />
                <div className="min-w-0 flex flex-col">
                  <span className="text-sm truncate leading-tight" style={{ color: "hsl(var(--foreground))" }}>{name}</span>
                  {parent && (
                    <span className="text-xs truncate opacity-40 leading-tight" style={{ color: "hsl(var(--muted-foreground))" }}>{parent}</span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
