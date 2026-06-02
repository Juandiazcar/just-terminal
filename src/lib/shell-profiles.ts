import type { ShellProfile } from "@/types/terminal.types"

// Injects OSC 7 prompt function via -Command arg so it runs silently at startup
// (injecting via writeInput echoes the text visibly in the terminal)
const PS_OSC7_CMD =
  `$function:prompt={$p=$ExecutionContext.SessionState.Path.CurrentLocation.Path;[Console]::Write([string][char]27+"]7;file://localhost/"+$p.Replace('\\','/')+[string][char]7);"PS $p> "}`

export const SHELL_PROFILES: ShellProfile[] = [
  {
    name: "PowerShell 7",
    executable: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
    args: ["-NoLogo", "-NoExit", "-Command", PS_OSC7_CMD],
  },
  {
    name: "PowerShell",
    executable: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    args: ["-NoLogo", "-NoExit", "-Command", PS_OSC7_CMD],
  },
  { name: "CMD", executable: "C:\\Windows\\System32\\cmd.exe", args: [] },
  { name: "Git Bash", executable: "bash.exe", args: ["--login", "-i"] },
  { name: "WSL", executable: "wsl.exe", args: [] },
]

export function getDefaultShell(): ShellProfile {
  // Return PS7 if available, fall back to Windows PowerShell
  return SHELL_PROFILES[1]
}

export function findShellByName(name: string): ShellProfile | undefined {
  return SHELL_PROFILES.find((s) => s.name === name)
}

export function isOsc7Shell(shell: ShellProfile): boolean {
  const exe = shell.executable.toLowerCase()
  return exe.includes("pwsh") || exe.includes("powershell")
}
