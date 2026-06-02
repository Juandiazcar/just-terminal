import { useEffect } from "react"
import { Settings } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { useSettingsStore, PRESET_THEMES } from "@/store/settings.store"
import { useSessionStore } from "@/store/session.store"
import { cn } from "@/lib/utils"

// Apply custom CSS vars to body whenever settings change
export function useApplySettings() {
  const { customVars, fontSize, fontFamily, zoom } = useSettingsStore()

  useEffect(() => {
    for (const [key, value] of Object.entries(customVars)) {
      document.body.style.setProperty(key, value)
    }
  }, [customVars])

  useEffect(() => {
    document.body.style.setProperty("--font-size-terminal", `${fontSize}px`)
    document.body.style.setProperty("--font-family-terminal", fontFamily)
    // Apply font size to whole UI (non-terminal elements)
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize, fontFamily])

  useEffect(() => {
    document.documentElement.style.setProperty("--app-zoom", String(zoom))
  }, [zoom])
}

const COLOR_VARS = [
  { label: "Background", key: "--background", hint: "HSL e.g. 240 10% 4%" },
  { label: "Foreground", key: "--foreground", hint: "HSL e.g. 0 0% 98%" },
  { label: "Primary", key: "--primary", hint: "HSL e.g. 217 91% 60%" },
  { label: "Border", key: "--border", hint: "HSL e.g. 240 4% 16%" },
  { label: "Muted text", key: "--muted-foreground", hint: "HSL e.g. 240 5% 65%" },
  { label: "Sidebar", key: "--sidebar-bg", hint: "HSL e.g. 240 10% 6%" },
]

export function SettingsPanel() {
  const { fontSize, fontFamily, activeThemeName, customVars, zoom, setFontSize, setFontFamily, applyPreset, setCustomVar, setZoom, zoomReset } =
    useSettingsStore()
  const { theme, setTheme } = useSessionStore()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          title="Settings"
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/8"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          <Settings size={12} />
          <span>Settings</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: "hsl(var(--foreground))" }}>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 mt-2">
          {/* Base theme */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>Base Theme</h3>
            <div className="flex gap-2">
              {(["dark", "light"] as const).map((t) => (
                <Button
                  key={t}
                  variant={theme === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme(t)}
                >
                  {t === "dark" ? "Dark" : "Light"}
                </Button>
              ))}
            </div>
          </section>

          {/* Color presets */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>Color Preset</h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_THEMES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "text-left text-xs px-3 py-2 rounded-md border transition-colors",
                    activeThemeName === preset.name
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  )}
                  style={{
                    borderColor: activeThemeName === preset.name ? "hsl(var(--primary))" : "hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </section>

          {/* Custom colors */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>Custom Colors</h3>
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Override individual colors using HSL values (e.g. <code>217 91% 60%</code>)
            </p>
            {COLOR_VARS.map(({ label, key, hint }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0 border" style={{
                  background: `hsl(${customVars[key] || "0 0% 50%"})`,
                  borderColor: "hsl(var(--border))",
                }} />
                <label className="text-xs w-24 flex-shrink-0" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {label}
                </label>
                <Input
                  className="h-7 text-xs font-mono"
                  placeholder={hint}
                  value={customVars[key] || ""}
                  onChange={(e) => setCustomVar(key, e.target.value)}
                />
              </div>
            ))}
          </section>

          {/* Zoom */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
              Zoom
            </h3>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                  App Zoom: {Math.round(zoom * 100)}%
                </label>
                <button
                  className="text-xs px-2 py-0.5 rounded border transition-colors hover:bg-white/10"
                  style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
                  onClick={zoomReset}
                >
                  Reset
                </button>
              </div>
              <Slider
                min={60}
                max={150}
                step={5}
                value={[Math.round(zoom * 100)]}
                onValueChange={([v]) => setZoom(v / 100)}
              />
              <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                Also: Ctrl+= / Ctrl+- / Ctrl+0
              </p>
            </div>
          </section>

          {/* Terminal */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>Terminal</h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                Font Size: {fontSize}px
              </label>
              <Slider
                min={10}
                max={24}
                step={1}
                value={[fontSize]}
                onValueChange={([v]) => setFontSize(v)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                Font Family
              </label>
              <Input
                className="h-7 text-xs font-mono"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                placeholder="Cascadia Code, Consolas, monospace"
              />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
