// OSC 7 format: ESC ] 7 ; file://localhost/C:/path/to/dir BEL
const OSC7_REGEX = /\x1b\]7;file:\/\/[^/]*\/([^\x07\x1b]+)[\x07\x1b]/

export function extractCwdFromOsc7(data: string): string | null {
  const match = data.match(OSC7_REGEX)
  if (!match) return null
  const decoded = decodeURIComponent(match[1])
  return decoded.replace(/\//g, "\\").replace(/^\\([A-Za-z]:)/, "$1")
}

// Single-line — multiline causes Windows PowerShell to show ">>" continuation prompts
export const OSC7_PROMPT_INJECTION =
  `$function:prompt={$p=$ExecutionContext.SessionState.Path.CurrentLocation.Path;[Console]::Write("$([char]27)]7;file://localhost/$($p.Replace('\\','/'))$([char]7)");"PS $p> "}\r\n`
