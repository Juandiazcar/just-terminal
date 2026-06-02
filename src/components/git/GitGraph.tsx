import type { CommitInfo } from "@/types/git.types"

const LANE_W = 16
const ROW_H = 24
const DOT_R = 3.5

const COLORS = [
  "#7c9dff",
  "#7ee8a2",
  "#ffb86c",
  "#c792ea",
  "#ff5370",
  "#89ddff",
  "#ffd700",
  "#ff6e9c",
]
const col = (i: number) => COLORS[i % COLORS.length]

interface GraphRow {
  commit: CommitInfo
  lane: number
  wasExpected: boolean
  lanesBefore: (string | null)[]
  lanesAfter: (string | null)[]
}

function buildRows(commits: CommitInfo[]): GraphRow[] {
  let lanes: (string | null)[] = []
  const rows: GraphRow[] = []

  for (const commit of commits) {
    const existingIdx = lanes.findIndex((h) => h === commit.id)
    const wasExpected = existingIdx !== -1

    let lane = existingIdx
    if (lane === -1) {
      const empty = lanes.findIndex((h) => h === null)
      lane = empty !== -1 ? empty : lanes.length
      if (lane < lanes.length) lanes[lane] = commit.id
      else lanes.push(commit.id)
    }

    const lanesBefore = [...lanes]
    const lanesAfter = [...lanes]

    if (commit.parents.length === 0) {
      lanesAfter[lane] = null
    } else {
      lanesAfter[lane] = commit.parents[0]
      for (let p = 1; p < commit.parents.length; p++) {
        const ph = commit.parents[p]
        if (!lanesAfter.includes(ph)) {
          const empty = lanesAfter.findIndex((h) => h === null)
          if (empty !== -1) lanesAfter[empty] = ph
          else lanesAfter.push(ph)
        }
      }
    }

    while (lanesAfter.length > 0 && lanesAfter[lanesAfter.length - 1] === null)
      lanesAfter.pop()

    rows.push({ commit, lane, wasExpected, lanesBefore, lanesAfter })
    lanes = [...lanesAfter]
  }

  return rows
}

// Smooth bezier connecting two x positions across a row
function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cy = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${cy} ${x2} ${cy} ${x2} ${y2}`
}

function straightPath(x: number, y1: number, y2: number): string {
  return `M ${x} ${y1} L ${x} ${y2}`
}

function GraphPaths({ rows }: { rows: GraphRow[] }) {
  const maxLanes = rows.reduce((m, r) =>
    Math.max(m, r.lanesBefore.length, r.lanesAfter.length, r.lane + 1), 1)

  const paths: React.ReactNode[] = []

  rows.forEach((row, i) => {
    const yTop = i * ROW_H
    const yMid = yTop + ROW_H / 2
    const yBot = yTop + ROW_H
    const cx = (row.lane + 0.5) * LANE_W

    // Pass-through lanes (not the commit lane, active in before and after)
    const maxLen = Math.max(row.lanesBefore.length, row.lanesAfter.length)
    for (let l = 0; l < maxLen; l++) {
      if (l === row.lane) continue
      const inBefore = row.lanesBefore[l] != null
      const inAfter = row.lanesAfter[l] != null
      const x = (l + 0.5) * LANE_W

      if (inBefore && inAfter) {
        // straight pass-through
        paths.push(
          <path
            key={`pass-${i}-${l}`}
            d={straightPath(x, yTop, yBot)}
            stroke={col(l)}
            strokeWidth={1.5}
            fill="none"
          />
        )
      } else if (inBefore && !inAfter) {
        // lane ends here (merges into commit lane)
        paths.push(
          <path
            key={`merge-in-${i}-${l}`}
            d={bezierPath(x, yTop, cx, yMid)}
            stroke={col(l)}
            strokeWidth={1.5}
            fill="none"
          />
        )
      } else if (!inBefore && inAfter) {
        // new lane branches out from commit
        paths.push(
          <path
            key={`branch-out-${i}-${l}`}
            d={bezierPath(cx, yMid, x, yBot)}
            stroke={col(l)}
            strokeWidth={1.5}
            fill="none"
          />
        )
      }
    }

    // Incoming line to commit dot (only if this commit was expected from a parent)
    if (row.wasExpected) {
      paths.push(
        <path
          key={`in-${i}`}
          d={straightPath(cx, yTop, yMid)}
          stroke={col(row.lane)}
          strokeWidth={1.5}
          fill="none"
        />
      )
    }

    // Outgoing lines from commit dot to parents
    if (row.commit.parents.length > 0) {
      const p0AfterIdx = row.lanesAfter.findIndex((h) => h === row.commit.parents[0])
      const p0x = p0AfterIdx !== -1 ? (p0AfterIdx + 0.5) * LANE_W : cx

      if (Math.abs(p0x - cx) < 1) {
        // Same lane — straight
        paths.push(
          <path
            key={`out0-${i}`}
            d={straightPath(cx, yMid, yBot)}
            stroke={col(row.lane)}
            strokeWidth={1.5}
            fill="none"
          />
        )
      } else {
        paths.push(
          <path
            key={`out0-${i}`}
            d={bezierPath(cx, yMid, p0x, yBot)}
            stroke={col(row.lane)}
            strokeWidth={1.5}
            fill="none"
          />
        )
      }

      // Additional parents (merge lines already handled by "branch-out" logic above)
      for (let p = 1; p < row.commit.parents.length; p++) {
        const pmAfterIdx = row.lanesAfter.findIndex((h) => h === row.commit.parents[p])
        if (pmAfterIdx !== -1) {
          const pmx = (pmAfterIdx + 0.5) * LANE_W
          paths.push(
            <path
              key={`out${p}-${i}`}
              d={bezierPath(cx, yMid, pmx, yBot)}
              stroke={col(pmAfterIdx)}
              strokeWidth={1.5}
              fill="none"
            />
          )
        }
      }
    }

    // Commit dot (rendered last so it's on top)
    paths.push(
      <circle
        key={`dot-${i}`}
        cx={cx}
        cy={yMid}
        r={DOT_R}
        fill={col(row.lane)}
        stroke="hsl(var(--background))"
        strokeWidth={1.5}
      />
    )
  })

  return <>{paths}</>
}

function timeAgo(ts: number): string {
  const d = Math.floor(Date.now() / 1000) - ts
  if (d < 60) return `${d}s`
  if (d < 3600) return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  if (d < 2592000) return `${Math.floor(d / 86400)}d`
  return `${Math.floor(d / 2592000)}mo`
}

export function GitGraph({ commits }: { commits: CommitInfo[] }) {
  const rows = buildRows(commits)
  if (rows.length === 0) {
    return (
      <div className="px-3 py-4 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        No commits found
      </div>
    )
  }

  const maxLanes = rows.reduce(
    (m, r) => Math.max(m, r.lanesBefore.length, r.lanesAfter.length, r.lane + 1),
    1
  )
  const svgW = (maxLanes + 0.5) * LANE_W
  const totalH = rows.length * ROW_H

  return (
    <div className="overflow-y-auto flex-1" style={{ fontSize: "11px" }}>
      <div style={{ position: "relative", height: totalH }}>
        {/* Single continuous SVG for all graph lines */}
        <svg
          width={svgW}
          height={totalH}
          style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
        >
          <GraphPaths rows={rows} />
        </svg>

        {/* Text rows, offset to the right of the SVG */}
        <div style={{ paddingLeft: svgW }}>
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 hover:bg-white/5 cursor-default group overflow-hidden"
              style={{ height: ROW_H }}
              title={`${row.commit.id} — ${row.commit.author}`}
            >
              {/* Ref badges */}
              {row.commit.refs.slice(0, 2).map((ref) => (
                <span
                  key={ref}
                  className="px-1 rounded text-[9px] font-medium flex-shrink-0"
                  style={{
                    background: ref.includes("HEAD")
                      ? "hsl(var(--primary) / 0.25)"
                      : "hsl(var(--secondary))",
                    color: ref.includes("HEAD")
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted-foreground))",
                    border: `1px solid ${
                      ref.includes("HEAD")
                        ? "hsl(var(--primary) / 0.4)"
                        : "hsl(var(--border))"
                    }`,
                  }}
                >
                  {ref.replace("HEAD -> ", "")}
                </span>
              ))}

              {/* Commit message */}
              <span className="truncate flex-1 pr-1" style={{ color: "hsl(var(--foreground))" }}>
                {row.commit.message}
              </span>

              {/* Time (on hover) */}
              <span
                className="flex-shrink-0 pr-2 opacity-0 group-hover:opacity-60 transition-opacity text-[10px]"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                {timeAgo(row.commit.time)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
