// OSC 7 format: ESC ] 7 ; file://host/C:/path/to/dir BEL   (Windows)
//               ESC ] 7 ; file://host/home/user/dir BEL    (macOS / Linux)
const OSC7_PREFIX = "\x1b]7;"
const OSC7_REGEX = /\x1b\]7;file:\/\/[^/]*\/([^\x07\x1b]+)[\x07\x1b]/

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    // Unix directory names may legitimately contain a bare '%'
    return value
  }
}

export function extractCwdFromOsc7(data: string): string | null {
  // Fast path: this runs on every output chunk, almost none contain OSC 7
  if (!data.includes(OSC7_PREFIX)) return null
  const match = data.match(OSC7_REGEX)
  if (!match) return null
  const decoded = "/" + safeDecode(match[1]).replace(/^\/+/, "")
  if (/^\/[A-Za-z]:/.test(decoded)) {
    return decoded.slice(1).replace(/\//g, "\\")
  }
  return decoded
}
