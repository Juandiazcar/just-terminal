import { useEffect } from "react"
import { onFsChange } from "@/lib/tauri-bridge"
import { useExplorerStore } from "@/store/explorer.store"
import type { FsChangeEvent } from "@/types/explorer.types"

export function useFileWatcher() {
  const refresh = useExplorerStore((s) => s.refresh)
  const cwd = useExplorerStore((s) => s.cwd)

  useEffect(() => {
    let unlisten: (() => void) | null = null

    onFsChange((_event: FsChangeEvent) => {
      refresh()
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      unlisten?.()
    }
  }, [cwd, refresh])
}
