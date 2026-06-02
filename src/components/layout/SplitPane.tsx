import { useRef, useState, useCallback } from "react"
import type { ReactNode } from "react"

interface Props {
  direction: "horizontal" | "vertical"
  children: [ReactNode, ReactNode]
}

export function SplitPane({ direction, children }: Props) {
  const [splitRatio, setSplitRatio] = useState(0.5)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onMouseDown = useCallback(() => {
    dragging.current = true

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      if (direction === "horizontal") {
        const ratio = (e.clientX - rect.left) / rect.width
        setSplitRatio(Math.min(0.85, Math.max(0.15, ratio)))
      } else {
        const ratio = (e.clientY - rect.top) / rect.height
        setSplitRatio(Math.min(0.85, Math.max(0.15, ratio)))
      }
    }

    const onMouseUp = () => {
      dragging.current = false
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }, [direction])

  const isHorizontal = direction === "horizontal"
  const firstSize = `${splitRatio * 100}%`
  const secondSize = `${(1 - splitRatio) * 100}%`

  return (
    <div
      ref={containerRef}
      className={`flex w-full h-full ${isHorizontal ? "flex-row" : "flex-col"}`}
    >
      <div style={{ [isHorizontal ? "width" : "height"]: firstSize }} className="overflow-hidden">
        {children[0]}
      </div>
      <div
        className={`flex-shrink-0 ${
          isHorizontal
            ? "w-1 cursor-col-resize hover:bg-blue-500"
            : "h-1 cursor-row-resize hover:bg-blue-500"
        } bg-gray-700`}
        onMouseDown={onMouseDown}
      />
      <div
        style={{ [isHorizontal ? "width" : "height"]: secondSize }}
        className="overflow-hidden flex-1"
      >
        {children[1]}
      </div>
    </div>
  )
}
