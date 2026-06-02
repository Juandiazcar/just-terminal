import { useEffect, useRef } from "react"
import { getGitStatus } from "@/lib/tauri-bridge"
import { useGitStore } from "@/store/git.store"
import { useExplorerStore } from "@/store/explorer.store"

const DEBOUNCE_MS = 300

export function useGitStatus() {
  const cwd = useExplorerStore((s) => s.cwd)
  const setStatus = useGitStore((s) => s.setStatus)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!cwd) return

    const check = () => {
      getGitStatus(cwd)
        .then((status) => setStatus(cwd, status))
        .catch(() => {})
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(check, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [cwd, setStatus])
}
