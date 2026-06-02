import { useTerminalsStore } from "@/store/terminals.store"
import { TerminalPane } from "./TerminalPane"
import { SplitPane } from "@/components/layout/SplitPane"
import { getDefaultShell } from "@/lib/shell-profiles"

interface Props {
  tabId: string
}

export function TerminalTab({ tabId }: Props) {
  const session = useTerminalsStore((s) => s.sessions[tabId])
  const split = useTerminalsStore((s) => s.splits[tabId])

  if (!session) return null

  const shell = session.shell?.executable ? session.shell : getDefaultShell()

  if (split?.direction && split.paneIds) {
    return (
      <SplitPane direction={split.direction}>
        <TerminalPane terminalId={split.paneIds[0]} shell={shell} initialCwd={session.cwd} />
        <TerminalPane terminalId={split.paneIds[1]} shell={shell} initialCwd={session.cwd} />
      </SplitPane>
    )
  }

  return <TerminalPane terminalId={tabId} shell={shell} initialCwd={session.cwd} />
}
