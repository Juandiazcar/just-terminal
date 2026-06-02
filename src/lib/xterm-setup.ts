import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { SearchAddon } from "@xterm/addon-search"

export type XtermBundle = {
  term: Terminal
  fitAddon: FitAddon
  searchAddon: SearchAddon
}

function getDarkTheme() {
  return {
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    cursor: "#f5e0dc",
    selectionBackground: "#585b70",
    black: "#45475a",
    red: "#f38ba8",
    green: "#a6e3a1",
    yellow: "#f9e2af",
    blue: "#89b4fa",
    magenta: "#f5c2e7",
    cyan: "#94e2d5",
    white: "#bac2de",
    brightBlack: "#585b70",
    brightRed: "#f38ba8",
    brightGreen: "#a6e3a1",
    brightYellow: "#f9e2af",
    brightBlue: "#89b4fa",
    brightMagenta: "#f5c2e7",
    brightCyan: "#94e2d5",
    brightWhite: "#a6adc8",
  }
}

function getLightTheme() {
  return {
    background: "#eff1f5",
    foreground: "#4c4f69",
    cursor: "#dc8a78",
    selectionBackground: "#acb0be",
    black: "#5c5f77",
    red: "#d20f39",
    green: "#40a02b",
    yellow: "#df8e1d",
    blue: "#1e66f5",
    magenta: "#ea76cb",
    cyan: "#179299",
    white: "#acb0be",
    brightBlack: "#6c6f85",
    brightRed: "#d20f39",
    brightGreen: "#40a02b",
    brightYellow: "#df8e1d",
    brightBlue: "#1e66f5",
    brightMagenta: "#ea76cb",
    brightCyan: "#179299",
    brightWhite: "#bcc0cc",
  }
}

export function getXtermTheme(isDark: boolean) {
  return isDark ? getDarkTheme() : getLightTheme()
}

export function createXterm(isDark: boolean, fontSize = 14, scrollback = 10000): XtermBundle {
  const term = new Terminal({
    cursorBlink: true,
    fontFamily: "Cascadia Code, Consolas, monospace",
    fontSize,
    theme: getXtermTheme(isDark),
    allowTransparency: false,
    scrollback,
    windowsPty: {
      backend: "conpty",
      buildNumber: 22000,
    },
  })

  const fitAddon = new FitAddon()
  const webLinksAddon = new WebLinksAddon()
  const searchAddon = new SearchAddon()

  term.loadAddon(fitAddon)
  term.loadAddon(webLinksAddon)
  term.loadAddon(searchAddon)

  return { term, fitAddon, searchAddon }
}
