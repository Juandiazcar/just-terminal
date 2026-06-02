import { useRef, useState } from "react"
import { FolderOpen, GitBranch } from "lucide-react"
import { Favorites } from "./Favorites"
import { RecentDirs } from "./RecentDirs"
import { FileTree } from "@/components/explorer/FileTree"
import { FileTreeToolbar } from "@/components/explorer/FileTreeToolbar"
import { GitGraphPanel } from "@/components/git/GitGraphPanel"
import { useFileWatcher } from "@/hooks/useFileWatcher"
import { useGitStatus } from "@/hooks/useGitStatus"
import { cn } from "@/lib/utils"

type Tab = "explorer" | "git"
const MIN = 48

export function Sidebar() {
  useFileWatcher()
  useGitStatus()

  const [tab, setTab] = useState<Tab>("explorer")
  const [favH, setFavH] = useState(100)
  const [treeH, setTreeH] = useState(320)
  const containerRef = useRef<HTMLDivElement>(null)

  const startResize = (which: "fav-tree" | "tree-recent") => (e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startFav = favH
    const startTree = treeH

    const move = (ev: MouseEvent) => {
      const dy = ev.clientY - startY
      if (which === "fav-tree") {
        setFavH(Math.max(MIN, startFav + dy))
        setTreeH(Math.max(MIN, startTree - dy))
      } else {
        setTreeH(Math.max(MIN, startTree + dy))
      }
    }
    const up = () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full overflow-hidden border-r"
      style={{ background: "hsl(var(--sidebar-bg))", borderColor: "hsl(var(--border))" }}
    >
      {/* Warp-style tab switcher */}
      <div
        className="flex px-2 pt-2 pb-1 gap-1"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        {(["explorer", "git"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
              tab === t
                ? "text-foreground"
                : "opacity-40 hover:opacity-65"
            )}
            style={{
              background: tab === t ? "hsl(var(--secondary))" : "transparent",
              color: tab === t ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            {t === "explorer" ? <FolderOpen size={13} /> : <GitBranch size={13} />}
            <span>{t === "git" ? "Source Control" : "Explorer"}</span>
          </button>
        ))}
      </div>

      {/* Explorer */}
      {tab === "explorer" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-hidden flex-shrink-0" style={{ height: favH }}>
            <Favorites />
          </div>

          <div
            className="h-1 flex-shrink-0 cursor-row-resize group"
            style={{ background: "hsl(var(--border))" }}
            onMouseDown={startResize("fav-tree")}
          >
            <div className="h-full transition-colors group-hover:bg-primary/40" />
          </div>

          <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ height: treeH }}>
            <FileTreeToolbar />
            <div className="flex-1 overflow-y-auto">
              <FileTree />
            </div>
          </div>

          <div
            className="h-1 flex-shrink-0 cursor-row-resize group"
            style={{ background: "hsl(var(--border))" }}
            onMouseDown={startResize("tree-recent")}
          >
            <div className="h-full transition-colors group-hover:bg-primary/40" />
          </div>

          <div className="flex-1 overflow-hidden" style={{ minHeight: MIN }}>
            <RecentDirs />
          </div>
        </div>
      )}

      {/* Source control */}
      {tab === "git" && (
        <div className="flex-1 overflow-hidden">
          <GitGraphPanel />
        </div>
      )}
    </div>
  )
}
