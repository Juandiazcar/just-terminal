import { useEffect } from "react"
import { onFsChange } from "@/lib/tauri-bridge"
import { useExplorerStore } from "@/store/explorer.store"
import type { FsChangeEvent } from "@/types/explorer.types"

// Bursts of fs events (builds, git checkouts) collapse into a single re-list
const REFRESH_DEBOUNCE_MS = 120

export function useFileWatcher() {
  const refresh = useExplorerStore((s) => s.refresh)
  const cwd = useExplorerStore((s) => s.cwd)

  useEffect(() => {
    let unlisten: (() => void) | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    onFsChange((_event: FsChangeEvent) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        refresh()
      }, REFRESH_DEBOUNCE_MS)
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      if (timer) clearTimeout(timer)
      unlisten?.()
    }
  }, [cwd, refresh])
}
