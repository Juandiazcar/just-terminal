import { useState } from "react"
import { useGitStore } from "@/store/git.store"
import { useExplorerStore } from "@/store/explorer.store"
import {
  gitFetch,
  gitPull,
  gitPush,
  gitStash,
  gitStashPop,
  gitBranches,
  gitCheckout,
} from "@/lib/tauri-bridge"
import { handleCommandError } from "@/lib/error-handler"
import { getGitStatus } from "@/lib/tauri-bridge"

export function GitActionsPanel() {
  const cwd = useExplorerStore((s) => s.cwd)
  const setStatus = useGitStore((s) => s.setStatus)
  const status = useGitStore((s) => (cwd ? s.statusByPath[cwd] : undefined))
  const [branches, setBranches] = useState<string[]>([])
  const [showBranches, setShowBranches] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!status?.isRepo || !cwd) return null

  const run = async (fn: () => Promise<void>, label: string) => {
    setBusy(true)
    try {
      await fn()
      const updated = await getGitStatus(cwd)
      setStatus(cwd, updated)
    } catch (e) {
      handleCommandError(`Git.${label}`, e)
    } finally {
      setBusy(false)
    }
  }

  const loadBranches = async () => {
    if (showBranches) {
      setShowBranches(false)
      return
    }
    try {
      const list = await gitBranches(cwd)
      setBranches(list)
      setShowBranches(true)
    } catch (e) {
      handleCommandError("Git.branches", e)
    }
  }

  return (
    <div className="px-2 py-2 flex flex-col gap-1">
      <p className="text-xs font-semibold opacity-60 uppercase tracking-wider mb-1">Git</p>
      <div className="flex flex-wrap gap-1">
        {[
          { label: "Fetch", fn: () => gitFetch(cwd) },
          { label: "Pull", fn: () => gitPull(cwd) },
          { label: "Push", fn: () => gitPush(cwd) },
          { label: "Stash", fn: () => gitStash(cwd) },
          { label: "Pop", fn: () => gitStashPop(cwd) },
        ].map(({ label, fn }) => (
          <button
            key={label}
            disabled={busy}
            className="px-2 py-0.5 text-xs rounded border opacity-70 hover:opacity-100 disabled:opacity-30"
            style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
            onClick={() => run(fn, label)}
          >
            {label}
          </button>
        ))}
        <button
          className="px-2 py-0.5 text-xs rounded border opacity-70 hover:opacity-100"
          style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
          onClick={loadBranches}
        >
          Branches
        </button>
      </div>
      {showBranches && (
        <div className="mt-1 flex flex-col gap-0.5 max-h-32 overflow-y-auto">
          {branches.map((b) => (
            <button
              key={b}
              className={`text-left text-xs px-2 py-0.5 rounded hover:bg-white/10 ${
                b === status.branch ? "text-blue-400 font-medium" : "opacity-70"
              }`}
              onClick={() =>
                run(() => gitCheckout(cwd, b), "checkout").then(() =>
                  setShowBranches(false)
                )
              }
            >
              {b === status.branch ? "✓ " : "  "}{b}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
