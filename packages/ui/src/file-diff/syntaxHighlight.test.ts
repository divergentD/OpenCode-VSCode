import { describe, it, expect } from "vitest"
import { detectLanguage, refractor } from "./syntaxHighlight"

describe("syntaxHighlight", () => {
  describe("detectLanguage", () => {
    it("detects javascript from .js extension", () => {
      expect(detectLanguage("file.js")).toBe("javascript")
    })

    it("detects typescript from .ts extension", () => {
      expect(detectLanguage("file.ts")).toBe("typescript")
    })

    it("detects tsx from .tsx extension", () => {
      expect(detectLanguage("file.tsx")).toBe("tsx")
    })

    it("detects python from .py extension", () => {
      expect(detectLanguage("file.py")).toBe("python")
    })

    it("returns null for unknown extensions", () => {
      expect(detectLanguage("file.unknown")).toBeNull()
    })

    it("detects dockerfile from Dockerfile", () => {
      expect(detectLanguage("Dockerfile")).toBe("docker")
    })
  })

  describe("refractor", () => {
    it("has languages registered", () => {
      const languages = refractor.listLanguages()
      expect(languages.length).toBeGreaterThan(0)
      expect(languages).toContain("javascript")
      expect(languages).toContain("typescript")
      expect(languages).toContain("python")
    })

    it("can highlight javascript code", () => {
      const tokens = refractor.highlight('const x = "hello";', "javascript")
      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens[0].type).toBe("element")
    })

    it("can highlight typescript code", () => {
      const tokens = refractor.highlight("const x: string = 'hello';", "typescript")
      expect(tokens.length).toBeGreaterThan(0)
    })

    it("throws for unregistered languages", () => {
      expect(() => {
        refractor.highlight("code", "unknown-language")
      }).toThrow()
    })
  })
})
