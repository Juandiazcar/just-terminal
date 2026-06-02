import type { DirEntry } from "@/types/explorer.types"

type Listener = (entry: DirEntry | null) => void

let entry: DirEntry | null = null
let startX = 0
let startY = 0
let active = false
const listeners: Set<Listener> = new Set()

function notify() {
  listeners.forEach((l) => l(active ? entry : null))
}

export const DragManager = {
  onStateChange(fn: Listener) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  beginWatch(e: DirEntry, x: number, y: number) {
    entry = e
    startX = x
    startY = y
    active = false

    const onMove = (ev: MouseEvent) => {
      if (active) return
      if (Math.abs(ev.clientX - startX) > 6 || Math.abs(ev.clientY - startY) > 6) {
        active = true
        notify()
      }
    }

    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      if (active) {
        active = false
        notify()
      }
      entry = null
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  },

  consume(): DirEntry | null {
    const e = entry
    entry = null
    active = false
    notify()
    return e
  },

  isDragging: () => active,
  getEntry: () => entry,
}
