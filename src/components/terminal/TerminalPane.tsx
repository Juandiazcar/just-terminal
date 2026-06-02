import { useEffect, useRef, useState } from "react"
import { useTerminal } from "@/hooks/useTerminal"
import { DragManager } from "@/lib/drag-manager"
import { writeInput, createTerminal } from "@/lib/tauri-bridge"
import { useTerminalsStore, makeSession } from "@/store/terminals.store"
import { useExplorerStore } from "@/store/explorer.store"
import { getDefaultShell } from "@/lib/shell-profiles"
import { handleCommandError } from "@/lib/error-handler"
import type { ShellProfile } from "@/types/terminal.types"

interface Props {
  terminalId: string
  shell: ShellProfile
  initialCwd: string
}

export function TerminalPane({ terminalId, shell, initialCwd }: Props) {
  const { containerRef, ptyIdRef } = useTerminal(terminalId, shell, initialCwd)
  const [dragOver, setDragOver] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return DragManager.onStateChange((entry) => {
      setDragOver(entry !== null)
    })
  }, [])

  const handleDrop = () => {
    const entry = DragManager.consume()
    if (!entry?.isDir || !ptyIdRef.current) return
    writeInput(ptyIdRef.current, `cd "${entry.path}"\r`).catch((e) =>
      handleCommandError("TerminalPane.drop", e)
    )
    setDragOver(false)
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ background: "hsl(var(--background))" }}
      />
      {dragOver && (
        <div
          ref={overlayRef}
          className="absolute inset-0 z-20 flex items-center justify-center transition-all"
          style={{
            background: "hsl(var(--primary) / 0.06)",
            border: "2px dashed hsl(var(--primary) / 0.5)",
            borderRadius: "8px",
          }}
          onMouseUp={handleDrop}
        >
          <div
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "hsl(var(--primary) / 0.15)",
              color: "hsl(var(--primary))",
              border: "1px solid hsl(var(--primary) / 0.3)",
            }}
          >
            Drop to cd here
          </div>
        </div>
      )}
    </div>
  )
}
