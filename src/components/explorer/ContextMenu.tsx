import { useEffect, useRef, useState } from "react"
import { Terminal, Copy, Trash2 } from "lucide-react"
import type { DirEntry } from "@/types/explorer.types"
import { deleteEntry, writeInput } from "@/lib/tauri-bridge"
import { useExplorerStore } from "@/store/explorer.store"
import { useTerminalsStore } from "@/store/terminals.store"
import { handleCommandError } from "@/lib/error-handler"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface Props {
  entry: DirEntry
  x: number
  y: number
  onClose: () => void
}

export function ContextMenu({ entry, x, y, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const refresh = useExplorerStore((s) => s.refresh)
  const activeId = useTerminalsStore((s) => s.activeId)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Don't close context menu while confirm dialog is open
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (confirmDelete) return
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener("mousedown", handler)
    return () => window.removeEventListener("mousedown", handler)
  }, [onClose, confirmDelete])

  const doDelete = async () => {
    await deleteEntry(entry.path, entry.isDir).catch((e) =>
      handleCommandError("ContextMenu.delete", e)
    )
    setConfirmDelete(false)
    onClose()
    refresh()
  }

  const actions = [
    ...(entry.isDir
      ? [
          {
            icon: Terminal,
            label: "Open Terminal Here",
            action: () => {
              if (activeId) writeInput(activeId, `cd "${entry.path}"\r`).catch(() => {})
              onClose()
            },
          },
        ]
      : []),
    {
      icon: Copy,
      label: "Copy Path",
      action: () => { navigator.clipboard.writeText(entry.path); onClose() },
    },
    null,
    {
      icon: Trash2,
      label: "Delete",
      danger: true,
      action: () => setConfirmDelete(true),
    },
  ]

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-50 min-w-44 rounded-lg border shadow-2xl py-1"
        style={{
          left: x,
          top: y,
          background: "hsl(var(--popover))",
          borderColor: "hsl(var(--border))",
          color: "hsl(var(--popover-foreground))",
        }}
      >
        {actions.map((a, i) =>
          a === null ? (
            <div key={i} className="my-1 mx-1 border-t" style={{ borderColor: "hsl(var(--border))" }} />
          ) : (
            <button
              key={a.label}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 transition-colors rounded-sm"
              style={{
                margin: "0 4px",
                width: "calc(100% - 8px)",
                color: a.danger ? "hsl(var(--destructive))" : "hsl(var(--popover-foreground))",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--accent) / 0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              onClick={a.action}
            >
              <a.icon size={14} className="flex-shrink-0" />
              {a.label}
            </button>
          )
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete "${entry.name}"`}
        description={`This will permanently delete ${entry.isDir ? "this folder and all its contents" : "this file"}. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
