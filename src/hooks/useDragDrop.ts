import { useCallback } from "react"
import { writeInput, createTerminal } from "@/lib/tauri-bridge"
import { useTerminalsStore, makeSession } from "@/store/terminals.store"
import { useExplorerStore } from "@/store/explorer.store"
import { getDefaultShell } from "@/lib/shell-profiles"
import { handleCommandError } from "@/lib/error-handler"
import { dragState } from "@/lib/drag-state"
import type { DirEntry } from "@/types/explorer.types"

export function useDragDrop() {
  const { addSession } = useTerminalsStore()
  const setCwd = useExplorerStore((s) => s.setCwd)

  const onDragStart = useCallback(
    (entry: DirEntry) => (e: React.DragEvent) => {
      dragState.start(entry)
      e.dataTransfer.effectAllowed = "copy"
      // fallback text for OS drop targets
      e.dataTransfer.setData("text/plain", entry.path)
    },
    []
  )

  const onDragEnd = useCallback(() => {
    dragState.end()
  }, [])

  const onDropToTerminal = useCallback((ptyId: string) => {
    const entry = dragState.get()
    dragState.end()
    if (!entry?.isDir) return
    writeInput(ptyId, `cd "${entry.path}"\r`).catch((err) =>
      handleCommandError("DragDrop.cd", err)
    )
  }, [])

  const onDropToNewTerminal = useCallback(() => {
    const entry = dragState.get()
    dragState.end()
    if (!entry?.isDir) return
    const shell = getDefaultShell()
    createTerminal(shell.executable, shell.args ?? [], entry.path)
      .then((id) => {
        addSession(makeSession(id, shell, entry.path))
        setCwd(entry.path).catch(() => {})
      })
      .catch((err) => handleCommandError("DragDrop.newTerminal", err))
  }, [addSession, setCwd])

  return { onDragStart, onDragEnd, onDropToTerminal, onDropToNewTerminal }
}
