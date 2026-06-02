import { StarOff, Star } from "lucide-react"
import { useSessionStore } from "@/store/session.store"
import { useExplorerStore } from "@/store/explorer.store"
import { useTerminalsStore } from "@/store/terminals.store"
import { writeInput } from "@/lib/tauri-bridge"
import { handleCommandError } from "@/lib/error-handler"

function FolderIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 5a1 1 0 011-1h5l1.5 2H14a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V5z" fill="#f59e0b" fillOpacity="0.8" />
      <path d="M1 4a1 1 0 011-1h4.5l1 1.5H1V4z" fill="#f59e0b" fillOpacity="0.5" />
    </svg>
  )
}

export function Favorites() {
  const { favorites, removeFavorite, addFavorite } = useSessionStore()
  const setCwd = useExplorerStore((s) => s.setCwd)
  const cwd = useExplorerStore((s) => s.cwd)
  const activeId = useTerminalsStore((s) => s.activeId)
  const isFav = cwd ? favorites.includes(cwd) : false

  const navigate = (path: string) => {
    setCwd(path).catch(() => {})
    if (activeId) {
      writeInput(activeId, `cd "${path}"\r`).catch((e) =>
        handleCommandError("Favorites.navigate", e)
      )
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
          Favorites
        </span>
        {cwd && (
          <button
            title={isFav ? "Remove" : "Add current folder"}
            className="opacity-40 hover:opacity-90 transition-opacity"
            onClick={() => (isFav ? removeFavorite(cwd) : addFavorite(cwd))}
          >
            {isFav
              ? <StarOff size={15} style={{ color: "#f59e0b" }} />
              : <Star size={15} style={{ color: "hsl(var(--muted-foreground))" }} />
            }
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {favorites.length === 0 ? (
          <p className="px-3 py-3 text-sm opacity-50" style={{ color: "hsl(var(--muted-foreground))" }}>
            Navigate to a folder and click ☆
          </p>
        ) : (
          favorites.map((path) => {
            const parts = path.split(/[/\\]/).filter(Boolean)
            const name = parts.at(-1) ?? path
            const parent = parts.at(-2)
            return (
              <div
                key={path}
                className="group flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors"
              >
                <FolderIcon />
                <button className="min-w-0 flex flex-col flex-1 text-left" onClick={() => navigate(path)} title={path}>
                  <span className="text-sm truncate leading-tight" style={{ color: "hsl(var(--foreground))" }}>{name}</span>
                  {parent && (
                    <span className="text-xs truncate opacity-40 leading-tight" style={{ color: "hsl(var(--muted-foreground))" }}>{parent}</span>
                  )}
                </button>
                <button
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 flex-shrink-0 transition-opacity"
                  onClick={() => removeFavorite(path)}
                >
                  <Star size={13} style={{ color: "#f59e0b" }} className="fill-current" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
