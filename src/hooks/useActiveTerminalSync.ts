import { useEffect } from "react"
import { useTerminalsStore } from "@/store/terminals.store"
import { useExplorerStore } from "@/store/explorer.store"

// Syncs explorer CWD whenever the active terminal changes
export function useActiveTerminalSync() {
  const activeId = useTerminalsStore((s) => s.activeId)
  const sessions = useTerminalsStore((s) => s.sessions)
  const setCwd = useExplorerStore((s) => s.setCwd)

  useEffect(() => {
    if (!activeId) return
    const cwd = sessions[activeId]?.cwd
    if (cwd) setCwd(cwd).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])
}
