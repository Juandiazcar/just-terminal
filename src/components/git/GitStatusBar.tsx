import { GitBranch, GitCommit, ArrowUp, ArrowDown } from "lucide-react"
import { useGitStore } from "@/store/git.store"
import { useExplorerStore } from "@/store/explorer.store"

export function GitStatusBar() {
  const cwd = useExplorerStore((s) => s.cwd)
  const status = useGitStore((s) => (cwd ? s.statusByPath[cwd] : undefined))

  if (!status?.isRepo) return null

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 text-xs border-b"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <GitBranch size={13} style={{ color: "hsl(var(--primary))" }} />
      <span className="font-medium" style={{ color: "hsl(var(--foreground))" }}>
        {status.branch}
      </span>
      {status.isDirty && (
        <span className="flex items-center gap-1" style={{ color: "hsl(40 90% 60%)" }}>
          <GitCommit size={14} />
          {status.modifiedCount > 0 && <span>~{status.modifiedCount}</span>}
          {status.stagedCount > 0 && <span>+{status.stagedCount}</span>}
          {status.untrackedCount > 0 && <span>?{status.untrackedCount}</span>}
        </span>
      )}
      {status.ahead > 0 && (
        <span className="flex items-center gap-0.5" style={{ color: "hsl(140 70% 55%)" }}>
          <ArrowUp size={14} />{status.ahead}
        </span>
      )}
      {status.behind > 0 && (
        <span className="flex items-center gap-0.5" style={{ color: "hsl(0 72% 60%)" }}>
          <ArrowDown size={14} />{status.behind}
        </span>
      )}
    </div>
  )
}
