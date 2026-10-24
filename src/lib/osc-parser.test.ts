import { describe, expect, it } from "vitest"
import { extractCwdFromOsc7 } from "./osc-parser"

const osc7 = (uri: string) => `\x1b]7;${uri}\x07`

describe("extractCwdFromOsc7", () => {
  it("returns null when no OSC 7 is present", () => {
    expect(extractCwdFromOsc7("plain output")).toBeNull()
  })

  it("parses Windows drive paths", () => {
    expect(extractCwdFromOsc7(osc7("file://localhost/C:/Users/me"))).toBe("C:\\Users\\me")
  })

  it("parses Linux/macOS paths", () => {
    expect(extractCwdFromOsc7(osc7("file://host/home/me/project"))).toBe("/home/me/project")
  })

  it("collapses the double slash produced by pwsh on Unix", () => {
    expect(extractCwdFromOsc7(osc7("file://localhost//home/me"))).toBe("/home/me")
  })

  it("decodes percent-encoding and tolerates a bare percent sign", () => {
    expect(extractCwdFromOsc7(osc7("file://h/tmp/a%20b"))).toBe("/tmp/a b")
    expect(extractCwdFromOsc7(osc7("file://h/tmp/100%"))).toBe("/tmp/100%")
  })
})
