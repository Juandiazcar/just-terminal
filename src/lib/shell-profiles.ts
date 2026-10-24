import type { ShellProfile } from "@/types/terminal.types"
import { getPlatform, isWindows } from "@/lib/platform"

// Injects OSC 7 prompt function via -Command arg so it runs silently at startup
// (injecting via writeInput echoes the text visibly in the terminal)
const PS_OSC7_CMD =
  `$function:prompt={$p=$ExecutionContext.SessionState.Path.CurrentLocation.Path;[Console]::Write([string][char]27+"]7;file://localhost/"+$p.Replace('\\','/')+[string][char]7);"PS $p> "}`

const PS_ARGS = ["-NoLogo", "-NoExit", "-Command", PS_OSC7_CMD]

const WINDOWS_PROFILES: ShellProfile[] = [
  {
    name: "PowerShell 7",
    executable: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
    args: PS_ARGS,
  },
  {
    name: "PowerShell",
    executable: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    args: PS_ARGS,
  },
  { name: "CMD", executable: "C:\\Windows\\System32\\cmd.exe", args: [] },
  { name: "Git Bash", executable: "bash.exe", args: ["--login", "-i"] },
  { name: "WSL", executable: "wsl.exe", args: [] },
]

// POSIX shells: OSC 7 is injected by the Rust backend (terminal/shell_integration.rs),
// except pwsh which takes it through args like on Windows.
function posixProfile(executable: string): ShellProfile {
  const name = executable.split("/").pop() ?? executable
  return { name, executable, args: name === "pwsh" ? PS_ARGS : ["-l"] }
}

export function getShellProfiles(): ShellProfile[] {
  if (isWindows()) return WINDOWS_PROFILES
  return getPlatform().shells.map(posixProfile)
}

export function getDefaultShell(): ShellProfile {
  if (isWindows()) {
    // Windows PowerShell ships with every install; PS7 may not be present.
    return WINDOWS_PROFILES[1]
  }
  return posixProfile(getPlatform().defaultShell ?? "/bin/sh")
}

export function findShellByName(name: string): ShellProfile | undefined {
  return getShellProfiles().find((s) => s.name === name)
}

export function isOsc7Shell(shell: ShellProfile): boolean {
  const exe = shell.executable.toLowerCase()
  return exe.includes("pwsh") || exe.includes("powershell")
}
