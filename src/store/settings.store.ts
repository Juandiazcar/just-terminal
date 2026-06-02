import { create } from "zustand"

export interface CustomTheme {
  name: string
  vars: Record<string, string>
}

export const PRESET_THEMES: CustomTheme[] = [
  {
    name: "Shadcn Dark",
    vars: {
      "--background": "240 10% 3.9%",
      "--foreground": "0 0% 98%",
      "--primary": "217 91% 60%",
      "--border": "240 4% 16%",
      "--sidebar-bg": "240 10% 6%",
    },
  },
  {
    name: "Catppuccin Mocha",
    vars: {
      "--background": "240 21% 15%",
      "--foreground": "226 64% 88%",
      "--primary": "267 84% 81%",
      "--border": "237 16% 23%",
      "--sidebar-bg": "240 21% 12%",
    },
  },
  {
    name: "Dracula",
    vars: {
      "--background": "231 15% 18%",
      "--foreground": "60 30% 96%",
      "--primary": "265 89% 78%",
      "--border": "232 14% 31%",
      "--sidebar-bg": "231 15% 14%",
    },
  },
  {
    name: "Tokyo Night",
    vars: {
      "--background": "225 27% 12%",
      "--foreground": "220 14% 71%",
      "--primary": "217 76% 67%",
      "--border": "225 20% 18%",
      "--sidebar-bg": "225 27% 9%",
    },
  },
]

interface SettingsState {
  fontSize: number
  fontFamily: string
  scrollback: number
  activeThemeName: string
  customVars: Record<string, string>
  zoom: number

  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void
  setScrollback: (lines: number) => void
  applyPreset: (preset: CustomTheme) => void
  setCustomVar: (key: string, value: string) => void
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  fontSize: 14,
  fontFamily: "Cascadia Code, Consolas, monospace",
  scrollback: 10000,
  activeThemeName: "Shadcn Dark",
  customVars: {},
  zoom: 1,

  setFontSize: (fontSize) => set({ fontSize }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setScrollback: (scrollback) => set({ scrollback }),
  setZoom: (zoom) => set({ zoom: Math.min(1.5, Math.max(0.6, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(1.5, parseFloat((s.zoom + 0.05).toFixed(2))) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.6, parseFloat((s.zoom - 0.05).toFixed(2))) })),
  zoomReset: () => set({ zoom: 1 }),

  applyPreset: (preset) =>
    set({ activeThemeName: preset.name, customVars: preset.vars }),

  setCustomVar: (key, value) =>
    set((state) => ({
      customVars: { ...state.customVars, [key]: value },
    })),
}))
