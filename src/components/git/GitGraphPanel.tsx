import { useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { GitGraph } from "./GitGraph"
import { GitStatusBar } from "./GitStatusBar"
import { useGitStore } from "@/store/git.store"
import { useExplorerStore } from "@/store/explorer.store"
import { getGitLog, getGitStatus } from "@/lib/tauri-bridge"

export function GitGraphPanel() {
  const cwd = useExplorerStore((s) => s.cwd)
  const { logByPath, statusByPath, setLog, setStatus } = useGitStore()
  const commits = cwd ? (logByPath[cwd] ?? []) : []
  const status = cwd ? statusByPath[cwd] : undefined

  const load = () => {
    if (!cwd) return
    getGitLog(cwd, 150)
      .then((log) => setLog(cwd, log))
      .catch(() => {})
    getGitStatus(cwd)
      .then((s) => setStatus(cwd, s))
      .catch(() => {})
  }

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd])

  if (!status?.isRepo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
        <span className="text-3xl opacity-10">⎇</span>
        <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          Not a git repository
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <GitStatusBar />
      <div
        className="flex items-center justify-between px-2 py-1 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(var(--muted-foreground))" }}>
          Commit Graph
        </span>
        <button
          onClick={load}
          className="p-0.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: "hsl(var(--muted-foreground))" }}
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <GitGraph commits={commits} />
      </div>
    </div>
  )
}
