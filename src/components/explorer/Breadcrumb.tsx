import { ChevronRight } from "lucide-react"
import { useExplorerStore } from "@/store/explorer.store"
import { useTerminalsStore } from "@/store/terminals.store"
import { writeInput } from "@/lib/tauri-bridge"
import { handleCommandError } from "@/lib/error-handler"

export function Breadcrumb() {
  const cwd = useExplorerStore((s) => s.cwd)
  const activeId = useTerminalsStore((s) => s.activeId)

  if (!cwd) return null

  const parts = cwd.split(/[/\\]/).filter(Boolean)

  const navigateTo = (index: number) => {
    if (!activeId) return
    const sliced = parts.slice(0, index + 1)
    const path = sliced.length === 1 && sliced[0].endsWith(":")
      ? sliced[0] + "\\"
      : sliced.join("\\")
    writeInput(activeId, `cd "${path}"\r`).catch((e) =>
      handleCommandError("Breadcrumb", e)
    )
  }

  return (
    <div
      className="flex items-center px-3 h-6 text-xs overflow-x-auto whitespace-nowrap border-t gap-0.5"
      style={{
        background: "hsl(var(--statusbar-bg))",
        borderColor: "hsl(var(--border))",
        color: "hsl(var(--muted-foreground))",
      }}
    >
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && <ChevronRight size={14} className="opacity-30" />}
          <button
            className="hover:text-foreground transition-colors px-0.5 rounded hover:bg-white/5"
            onClick={() => navigateTo(i)}
          >
            {part}
          </button>
        </span>
      ))}
    </div>
  )
}
