import { useEffect, useRef, useState } from "react"
import { Sidebar } from "@/components/sidebar/Sidebar"
import { TerminalTabBar } from "@/components/terminal/TerminalTabBar"
import { TerminalTab } from "@/components/terminal/TerminalTab"
import { Breadcrumb } from "@/components/explorer/Breadcrumb"
import { useTerminalsStore, makeSession } from "@/store/terminals.store"
import { useSessionStore } from "@/store/session.store"
import { useExplorerStore } from "@/store/explorer.store"
import { DragManager } from "@/lib/drag-manager"
import { createTerminal } from "@/lib/tauri-bridge"
import { getDefaultShell } from "@/lib/shell-profiles"
import { handleCommandError } from "@/lib/error-handler"

export function MainLayout() {
  const activeId = useTerminalsStore((s) => s.activeId)
  const { addSession } = useTerminalsStore()
  const setCwd = useExplorerStore((s) => s.setCwd)
  const { sidebarWidth, setSidebarWidth } = useSessionStore()
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [emptyDragOver, setEmptyDragOver] = useState(false)

  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setSidebarVisible((v) => !v)
    document.addEventListener("pse:toggle-sidebar", handler)
    return () => document.removeEventListener("pse:toggle-sidebar", handler)
  }, [])

  // Listen for folder drags to show drop zone on empty area
  useEffect(() => {
    return DragManager.onStateChange((entry) => {
      if (!activeId) setEmptyDragOver(entry !== null)
    })
  }, [activeId])

  const handleEmptyDrop = () => {
    const entry = DragManager.consume()
    setEmptyDragOver(false)
    if (!entry?.isDir) return
    const shell = getDefaultShell()
    createTerminal(shell.executable, shell.args ?? [], entry.path)
      .then((id) => {
        addSession(makeSession(id, shell, entry.path))
        setCwd(entry.path).catch(() => {})
      })
      .catch((e) => handleCommandError("MainLayout.drop", e))
  }

  const onDividerMouseDown = () => {
    dragging.current = true
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setSidebarWidth(Math.min(480, Math.max(160, e.clientX - rect.left)))
    }
    const onMouseUp = () => {
      dragging.current = false
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden"
      style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
    >
      {sidebarVisible && (
        <>
          <div style={{ width: sidebarWidth, flexShrink: 0 }} className="flex flex-col h-full overflow-hidden">
            <Sidebar />
          </div>
          <div
            className="w-px flex-shrink-0 cursor-col-resize transition-colors hover:bg-primary/50"
            style={{ background: "hsl(var(--border))" }}
            onMouseDown={onDividerMouseDown}
          />
        </>
      )}

      <div className="flex flex-row flex-1 overflow-hidden">
        <TerminalTabBar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            {activeId ? (
              <TerminalTab tabId={activeId} />
            ) : (
              <div
                className="flex flex-col items-center justify-center h-full gap-4"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                <div className="text-5xl opacity-10">⌨</div>
                <p className="text-sm">Press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: "hsl(var(--secondary))", color: "hsl(var(--foreground))" }}>Ctrl+T</kbd> to open a terminal</p>
                <p className="text-xs opacity-50">or drag a folder from the explorer</p>
              </div>
            )}

            {!activeId && emptyDragOver && (
              <div
                className="absolute inset-2 z-20 flex items-center justify-center rounded-lg transition-all"
                style={{
                  background: "hsl(var(--primary) / 0.06)",
                  border: "2px dashed hsl(var(--primary) / 0.5)",
                }}
                onMouseUp={handleEmptyDrop}
              >
                <div
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    background: "hsl(var(--primary) / 0.15)",
                    color: "hsl(var(--primary))",
                    border: "1px solid hsl(var(--primary) / 0.3)",
                  }}
                >
                  Drop to open terminal here
                </div>
              </div>
            )}
          </div>
          <Breadcrumb />
        </div>
      </div>
    </div>
  )
}
