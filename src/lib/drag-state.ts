import type { DirEntry } from "@/types/explorer.types"

let currentEntry: DirEntry | null = null
let dragging = false

export const dragState = {
  start: (entry: DirEntry) => {
    currentEntry = entry
    dragging = true
    document.dispatchEvent(new CustomEvent("pse:drag-start"))
  },
  end: () => {
    currentEntry = null
    dragging = false
    document.dispatchEvent(new CustomEvent("pse:drag-end"))
  },
  get: () => currentEntry,
  isDragging: () => dragging,
}
