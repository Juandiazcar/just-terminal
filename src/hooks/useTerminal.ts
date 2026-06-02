import { useCallback, useEffect, useRef } from "react"
import type { FitAddon } from "@xterm/addon-fit"
import type { Terminal } from "@xterm/xterm"
import { createXterm } from "@/lib/xterm-setup"
import {
  onPtyOutput,
  onTerminalClosed,
  writeInput,
  resizePty,
  killTerminal,
  createTerminal,
} from "@/lib/tauri-bridge"
import { extractCwdFromOsc7 } from "@/lib/osc-parser"
import { useTerminalsStore } from "@/store/terminals.store"
import { useExplorerStore } from "@/store/explorer.store"
import { useSessionStore } from "@/store/session.store"
import { handleCommandError } from "@/lib/error-handler"
import type { ShellProfile } from "@/types/terminal.types"

export function useTerminal(
  terminalId: string,
  shell: ShellProfile,
  initialCwd: string
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  // PTY id — starts as terminalId (already created by App/store), may change after restart
  const ptyIdRef = useRef<string>(terminalId)
  const unlistenRefs = useRef<Array<() => void>>([])

  const { updateCwd, sessions } = useTerminalsStore()
  const setCwd = useExplorerStore((s) => s.setCwd)
  const sessionPushRecent = useSessionStore((s) => s.pushRecentDir)
  const isDark = useSessionStore((s) => s.theme === "dark")

  const handleResize = useCallback(() => {
    if (!fitRef.current || !termRef.current) return
    fitRef.current.fit()
    const { cols, rows } = termRef.current
    resizePty(ptyIdRef.current, cols, rows).catch(() => {})
  }, [])

  useEffect(() => {
    if (!containerRef.current || !shell?.executable) return

    ptyIdRef.current = terminalId

    const { term, fitAddon } = createXterm(isDark)
    termRef.current = term
    fitRef.current = fitAddon

    const observer = new ResizeObserver(handleResize)
    observer.observe(containerRef.current)

    const rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return
      term.open(containerRef.current)
      fitAddon.fit()

      term.attachCustomKeyEventHandler((e) => {
        if (e.type !== "keydown") return true
        if (e.ctrlKey && !e.shiftKey && e.key === "c" && term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection()).catch(() => {})
          return false
        }
        if (e.ctrlKey && !e.shiftKey && e.key === "v") {
          navigator.clipboard
            .readText()
            .then((text) => {
              if (text) writeInput(ptyIdRef.current, text).catch(() => {})
            })
            .catch(() => {})
          return false
        }
        return true
      })
    })

    // PTY already exists — just wire the UI to it (OSC7 injected via -Command shell arg)
    term.onData((data) => {
      writeInput(ptyIdRef.current, data).catch((e) =>
        handleCommandError("Terminal.write", e)
      )
    })

    const setupListeners = async () => {
      const unlistenOutput = await onPtyOutput(terminalId, (data) => {
        const cwd = extractCwdFromOsc7(data)
        if (cwd) {
          updateCwd(terminalId, cwd)
          setCwd(cwd).catch(() => {})
          sessionPushRecent(cwd)
        }
        term.write(data)
      })

      const unlistenClosed = await onTerminalClosed(terminalId, (code) => {
        term.write(
          `\r\n\x1b[33mProcess exited with code ${code}. Press any key to restart.\x1b[0m\r\n`
        )
        const disposable = term.onData(() => {
          disposable.dispose()
          const cwd = sessions[terminalId]?.cwd ?? initialCwd
          createTerminal(shell.executable, shell.args ?? [], cwd)
            .then((newId) => {
              ptyIdRef.current = newId
            })
            .catch((e) => handleCommandError("Terminal.restart", e))
        })
      })

      unlistenRefs.current.push(unlistenOutput, unlistenClosed)
    }

    setupListeners().catch((e) => handleCommandError("Terminal.init", e))

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
      unlistenRefs.current.forEach((fn) => fn())
      unlistenRefs.current = []
      term.dispose()
      // Kill PTY only when session was removed from store (not on StrictMode remount)
      const sessionGone = !useTerminalsStore.getState().sessions[terminalId]
      if (sessionGone) {
        killTerminal(ptyIdRef.current).catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId])

  return { containerRef, ptyIdRef }
}
