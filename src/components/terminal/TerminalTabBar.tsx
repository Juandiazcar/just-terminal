import { useRef, useState } from "react"
import { Plus, X, TerminalSquare, Pencil, Pin, PinOff } from "lucide-react"
import { useTerminalsStore, makeSession } from "@/store/terminals.store"
import { useSessionStore } from "@/store/session.store"
import { createTerminal } from "@/lib/tauri-bridge"
import { getDefaultShell } from "@/lib/shell-profiles"
import { handleCommandError } from "@/lib/error-handler"
import { SettingsPanel } from "@/components/settings/SettingsPanel"
import { cn } from "@/lib/utils"

interface TabContextMenu { id: string; x: number; y: number }

export function TerminalTabBar() {
  const { sessions, order, activeId, setActive, removeSession, addSession, renameTab, togglePin, reorder } =
    useTerminalsStore()
  const _t = useSessionStore((s) => s.theme)

  const [ctxMenu, setCtxMenu] = useState<TabContextMenu | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  // Drag-reorder state
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  // Pinned first, then custom order
  const sortedIds = [
    ...order.filter((id) => sessions[id]?.pinned),
    ...order.filter((id) => !sessions[id]?.pinned),
  ].filter((id) => sessions[id])

  const openNewTab = () => {
    const shell = getDefaultShell()
    createTerminal(shell.executable, shell.args ?? [], "C:\\")
      .then((id) => addSession(makeSession(id, shell, "C:\\")))
      .catch((e) => handleCommandError("TabBar.newTab", e))
  }

  const startRename = (id: string) => {
    setCtxMenu(null)
    setRenamingId(id)
    setTimeout(() => renameRef.current?.select(), 0)
  }

  const commitRename = (id: string, value: string) => {
    if (value.trim()) renameTab(id, value.trim())
    setRenamingId(null)
  }

  const handleDragStart = (id: string, e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    setDragId(id)

    const onMove = () => {}
    const onUp = () => {
      if (dragId !== null || id) {
        // commit reorder on mouseup
      }
      setDragId(null)
      setDropTargetId(null)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mouseup", onUp)
  }

  const handleDrop = (targetId: string) => {
    if (dragId && dragId !== targetId) {
      reorder(dragId, targetId)
    }
    setDragId(null)
    setDropTargetId(null)
  }

  return (
    <div
      className="flex flex-col w-48 h-full border-r select-none"
      style={{ background: "hsl(var(--tab-bar-bg))", borderColor: "hsl(var(--border))" }}
      onClick={() => ctxMenu && setCtxMenu(null)}
      onMouseUp={() => { setDragId(null); setDropTargetId(null) }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <TerminalSquare size={15} style={{ color: "hsl(var(--primary))" }} />
          <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            Terminals
          </span>
        </div>
        <button
          onClick={openNewTab}
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
          style={{ color: "hsl(var(--muted-foreground))" }}
          title="New terminal (Ctrl+T)"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Tab list */}
      <div className="flex-1 overflow-y-auto px-2 flex flex-col gap-0.5 pb-2">
        {sortedIds.map((id) => {
          const session = sessions[id]
          if (!session) return null
          const isActive = id === activeId
          const isPinned = session.pinned ?? false
          const isRenaming = renamingId === id
          const isDragging = dragId === id
          const isDropTarget = dropTargetId === id && dragId !== id
          const folder = session.cwd?.split(/[/\\]/).filter(Boolean).pop() ?? "~"

          return (
            <div key={id}>
              {/* Drop indicator line */}
              {isDropTarget && (
                <div className="h-0.5 rounded-full mx-1 mb-0.5" style={{ background: "hsl(var(--primary))" }} />
              )}

              <div
                role="button"
                tabIndex={0}
                onClick={() => !isRenaming && setActive(id)}
                onKeyDown={(e) => e.key === "Enter" && !isRenaming && setActive(id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCtxMenu({ id, x: e.clientX, y: e.clientY })
                }}
                onMouseDown={(e) => handleDragStart(id, e)}
                onMouseEnter={() => dragId && dragId !== id && setDropTargetId(id)}
                onMouseLeave={() => dropTargetId === id && setDropTargetId(null)}
                className={cn(
                  "group relative flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all",
                  isActive ? "font-medium" : "opacity-55 hover:opacity-80",
                  isDragging && "opacity-30 scale-95"
                )}
                style={{
                  background: isActive ? "hsl(var(--card))" : "transparent",
                  boxShadow: isActive
                    ? "0 1px 3px hsl(0 0% 0% / 0.3), inset 0 0 0 1px hsl(var(--border))"
                    : "none",
                }}
              >
                {/* Active bar */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-full"
                    style={{ background: "hsl(var(--primary))" }}
                  />
                )}

                {/* Content */}
                <div className="flex flex-col min-w-0 flex-1 pl-1 pr-5">
                  {isRenaming ? (
                    <input
                      ref={renameRef}
                      autoFocus
                      defaultValue={session.title}
                      className="w-full text-sm bg-transparent outline-none border-b"
                      style={{
                        borderColor: "hsl(var(--primary))",
                        color: "hsl(var(--foreground))",
                        caretColor: "hsl(var(--primary))",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(id, e.currentTarget.value)
                        if (e.key === "Escape") setRenamingId(null)
                        e.stopPropagation()
                      }}
                      onBlur={(e) => commitRename(id, e.currentTarget.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate text-sm leading-tight" style={{ color: "hsl(var(--foreground))" }}>
                      {session.title}
                    </span>
                  )}
                  <span className="truncate text-xs leading-tight mt-0.5 opacity-45" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {folder}
                  </span>
                </div>

                {/* Pin indicator — bottom right, always visible when pinned */}
                {isPinned && (
                  <Pin
                    size={8}
                    className="absolute bottom-1.5 right-1.5"
                    style={{ color: "hsl(var(--primary))", opacity: 0.65 }}
                  />
                )}

                {/* Close button — top right, softly visible, full on hover */}
                {!isRenaming && (
                  <button
                    className="absolute top-1 right-1 w-4 h-4 rounded flex items-center justify-center transition-all opacity-20 group-hover:opacity-70 hover:!opacity-100 hover:bg-white/20"
                    style={{ color: "hsl(var(--foreground))" }}
                    onClick={(e) => { e.stopPropagation(); removeSession(id) }}
                    title="Close"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {sortedIds.length === 0 && (
          <p className="px-2 py-3 text-xs text-center opacity-40" style={{ color: "hsl(var(--muted-foreground))" }}>
            No terminals
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-2 py-2" style={{ borderColor: "hsl(var(--border))" }}>
        <SettingsPanel />
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 rounded-lg border py-1 min-w-36 shadow-2xl"
          style={{
            left: ctxMenu.x,
            top: ctxMenu.y,
            background: "hsl(var(--popover))",
            borderColor: "hsl(var(--border))",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            {
              icon: sessions[ctxMenu.id]?.pinned ? PinOff : Pin,
              label: sessions[ctxMenu.id]?.pinned ? "Unpin" : "Pin to top",
              action: () => { togglePin(ctxMenu.id); setCtxMenu(null) },
              color: "hsl(var(--primary))",
            },
            {
              icon: Pencil,
              label: "Rename",
              action: () => startRename(ctxMenu.id),
              color: "hsl(var(--primary))",
            },
          ].map(({ icon: Icon, label, action, color }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
              style={{ color: "hsl(var(--foreground))" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--accent) / 0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              onClick={action}
            >
              <Icon size={13} style={{ color }} />
              {label}
            </button>
          ))}
          <div className="my-1 mx-2 border-t" style={{ borderColor: "hsl(var(--border))" }} />
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs"
            style={{ color: "hsl(var(--destructive))" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--destructive) / 0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            onClick={() => { removeSession(ctxMenu.id); setCtxMenu(null) }}
          >
            <X size={13} />
            Close
          </button>
        </div>
      )}
    </div>
  )
}
