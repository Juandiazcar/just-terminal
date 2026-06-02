import { useEffect } from "react"
import { useTerminalsStore } from "@/store/terminals.store"
import { useSessionStore } from "@/store/session.store"
import { useExplorerStore } from "@/store/explorer.store"
import { useSettingsStore } from "@/store/settings.store"
import { createTerminal } from "@/lib/tauri-bridge"
import { makeSession } from "@/store/terminals.store"
import { getDefaultShell } from "@/lib/shell-profiles"
import { handleCommandError } from "@/lib/error-handler"

interface Binding {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  key: string
  action: () => void
}

export function useKeyBindings() {
  const { addSession, removeSession, activeId, sessions, setActive } =
    useTerminalsStore()
  const { setTheme, theme } = useSessionStore()
  const { setCwd } = useExplorerStore()
  const { zoomIn, zoomOut, zoomReset } = useSettingsStore()

  useEffect(() => {
    const ids = Object.keys(sessions)
    const activeIndex = activeId ? ids.indexOf(activeId) : -1

    const bindings: Binding[] = [
      {
        ctrl: true,
        key: "t",
        action: () => {
          const shell = getDefaultShell()
          createTerminal(shell.executable, shell.args ?? [], "C:\\")
            .then((id) => addSession(makeSession(id, shell, "C:\\")))
            .catch((e) => handleCommandError("KeyBinding.newTab", e))
        },
      },
      {
        ctrl: true,
        key: "w",
        action: () => {
          if (activeId) removeSession(activeId)
        },
      },
      {
        ctrl: true,
        key: "Tab",
        action: () => {
          if (ids.length === 0) return
          const next = (activeIndex + 1) % ids.length
          setActive(ids[next])
        },
      },
      {
        ctrl: true,
        shift: true,
        key: "Tab",
        action: () => {
          if (ids.length === 0) return
          const prev = (activeIndex - 1 + ids.length) % ids.length
          setActive(ids[prev])
        },
      },
      {
        ctrl: true,
        shift: true,
        key: "L",
        action: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      {
        ctrl: true,
        key: "b",
        action: () => {
          document.dispatchEvent(new CustomEvent("pse:toggle-sidebar"))
        },
      },
      {
        ctrl: true,
        key: "o",
        action: () => {
          document.dispatchEvent(new CustomEvent("pse:open-folder"))
        },
      },
      { ctrl: true, key: "=", action: zoomIn },
      { ctrl: true, key: "+", action: zoomIn },
      { ctrl: true, key: "-", action: zoomOut },
      { ctrl: true, key: "_", action: zoomOut },
      { ctrl: true, key: "0", action: zoomReset },
    ]

    const handler = (e: KeyboardEvent) => {
      for (const binding of bindings) {
        const ctrlOk = binding.ctrl ? e.ctrlKey : !e.ctrlKey || !binding.ctrl
        const shiftOk = binding.shift ? e.shiftKey : !binding.shift || true
        const keyOk = e.key === binding.key || e.key === binding.key.toLowerCase()

        if (ctrlOk && shiftOk && keyOk && e.ctrlKey === !!binding.ctrl) {
          if (binding.shift !== undefined && e.shiftKey !== binding.shift) continue
          e.preventDefault()
          binding.action()
          break
        }
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [activeId, sessions, addSession, removeSession, setActive, theme, setTheme, setCwd, zoomIn, zoomOut, zoomReset])
}
