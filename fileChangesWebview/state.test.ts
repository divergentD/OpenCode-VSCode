import { describe, it, expect } from "vitest"
import { reducer, initialState, AppState, Action } from "./state"
import type { FileDiff } from "./types"

describe("reducer", () => {
  const mockDiffs: FileDiff[] = [
    { file: "src/foo.ts", before: "old1", after: "new1", additions: 1, deletions: 1 },
    { file: "src/bar.ts", before: "old2", after: "new2", additions: 2, deletions: 2 },
  ]

  describe("init action", () => {
    it("should set sessionID, diffs, and reset expandedFiles", () => {
      const state: AppState = {
        sessionID: "old-session",
        diffs: [{ file: "old.ts", before: "", after: "", additions: 0, deletions: 0 }],
        expandedFiles: new Set(["some-file.ts"]),
      }
      const action: Action = { type: "init", sessionID: "new-session", diffs: mockDiffs }

      const result = reducer(state, action)

      expect(result.sessionID).toBe("new-session")
      expect(result.diffs).toEqual(mockDiffs)
      expect(result.expandedFiles.size).toBe(0)
    })

    it("should handle init with empty diffs", () => {
      const action: Action = { type: "init", sessionID: "session-1", diffs: [] }

      const result = reducer(initialState, action)

      expect(result.sessionID).toBe("session-1")
      expect(result.diffs).toEqual([])
      expect(result.expandedFiles.size).toBe(0)
    })
  })

  describe("update action", () => {
    it("should update sessionID and diffs while preserving expandedFiles", () => {
      const state: AppState = {
        sessionID: "old-session",
        diffs: [],
        expandedFiles: new Set(["src/foo.ts"]),
      }
      const action: Action = { type: "update", sessionID: "updated-session", diffs: mockDiffs }

      const result = reducer(state, action)

      expect(result.sessionID).toBe("updated-session")
      expect(result.diffs).toEqual(mockDiffs)
      expect(result.expandedFiles).toEqual(new Set(["src/foo.ts"]))
    })

    it("should update diffs without clearing expanded files", () => {
      const state: AppState = {
        sessionID: "session-1",
        diffs: mockDiffs,
        expandedFiles: new Set(["src/foo.ts", "src/bar.ts"]),
      }
      const newDiffs: FileDiff[] = [
        { file: "src/baz.ts", before: "old", after: "new", additions: 3, deletions: 0 },
      ]
      const action: Action = { type: "update", sessionID: "session-2", diffs: newDiffs }

      const result = reducer(state, action)

      expect(result.sessionID).toBe("session-2")
      expect(result.diffs).toEqual(newDiffs)
      expect(result.expandedFiles).toEqual(new Set(["src/foo.ts", "src/bar.ts"]))
    })
  })

  describe("file.toggle action", () => {
    it("should add file to expandedFiles when not present", () => {
      const state: AppState = {
        sessionID: null,
        diffs: [],
        expandedFiles: new Set(),
      }
      const action: Action = { type: "file.toggle", file: "src/foo.ts" }

      const result = reducer(state, action)

      expect(result.expandedFiles.has("src/foo.ts")).toBe(true)
      expect(result.expandedFiles.size).toBe(1)
    })

    it("should remove file from expandedFiles when already present", () => {
      const state: AppState = {
        sessionID: null,
        diffs: [],
        expandedFiles: new Set(["src/foo.ts", "src/bar.ts"]),
      }
      const action: Action = { type: "file.toggle", file: "src/foo.ts" }

      const result = reducer(state, action)

      expect(result.expandedFiles.has("src/foo.ts")).toBe(false)
      expect(result.expandedFiles.has("src/bar.ts")).toBe(true)
      expect(result.expandedFiles.size).toBe(1)
    })

    it("should create a new Set instance, not mutate the original", () => {
      const originalExpanded = new Set(["src/foo.ts"])
      const state: AppState = {
        sessionID: null,
        diffs: [],
        expandedFiles: originalExpanded,
      }
      const action: Action = { type: "file.toggle", file: "src/bar.ts" }

      const result = reducer(state, action)

      expect(result.expandedFiles).not.toBe(originalExpanded)
      expect(originalExpanded.size).toBe(1)
    })
  })

  describe("file.expand action", () => {
    it("should add file to expandedFiles", () => {
      const state: AppState = {
        sessionID: null,
        diffs: [],
        expandedFiles: new Set(["src/foo.ts"]),
      }
      const action: Action = { type: "file.expand", file: "src/bar.ts" }

      const result = reducer(state, action)

      expect(result.expandedFiles.has("src/foo.ts")).toBe(true)
      expect(result.expandedFiles.has("src/bar.ts")).toBe(true)
      expect(result.expandedFiles.size).toBe(2)
    })

    it("should handle expanding already expanded file gracefully", () => {
      const state: AppState = {
        sessionID: null,
        diffs: [],
        expandedFiles: new Set(["src/foo.ts"]),
      }
      const action: Action = { type: "file.expand", file: "src/foo.ts" }

      const result = reducer(state, action)

      expect(result.expandedFiles.size).toBe(1)
    })
  })

  describe("file.collapse action", () => {
    it("should remove file from expandedFiles", () => {
      const state: AppState = {
        sessionID: null,
        diffs: [],
        expandedFiles: new Set(["src/foo.ts", "src/bar.ts"]),
      }
      const action: Action = { type: "file.collapse", file: "src/foo.ts" }

      const result = reducer(state, action)

      expect(result.expandedFiles.has("src/foo.ts")).toBe(false)
      expect(result.expandedFiles.has("src/bar.ts")).toBe(true)
      expect(result.expandedFiles.size).toBe(1)
    })

    it("should handle collapsing non-expanded file gracefully", () => {
      const state: AppState = {
        sessionID: null,
        diffs: [],
        expandedFiles: new Set(["src/foo.ts"]),
      }
      const action: Action = { type: "file.collapse", file: "src/nonexistent.ts" }

      const result = reducer(state, action)

      expect(result.expandedFiles.size).toBe(1)
    })
  })

  describe("expand.all action", () => {
    it("should add all files from diffs to expandedFiles", () => {
      const state: AppState = {
        sessionID: null,
        diffs: mockDiffs,
        expandedFiles: new Set(),
      }
      const action: Action = { type: "expand.all" }

      const result = reducer(state, action)

      expect(result.expandedFiles.has("src/foo.ts")).toBe(true)
      expect(result.expandedFiles.has("src/bar.ts")).toBe(true)
      expect(result.expandedFiles.size).toBe(2)
    })

    it("should replace expandedFiles with all files from diffs", () => {
      const state: AppState = {
        sessionID: null,
        diffs: mockDiffs,
        expandedFiles: new Set(["src/extra.ts"]),
      }
      const action: Action = { type: "expand.all" }

      const result = reducer(state, action)

      expect(result.expandedFiles.has("src/extra.ts")).toBe(false)
      expect(result.expandedFiles.has("src/foo.ts")).toBe(true)
      expect(result.expandedFiles.has("src/bar.ts")).toBe(true)
      expect(result.expandedFiles.size).toBe(2)
    })

    it("should handle expand.all with empty diffs", () => {
      const state: AppState = {
        sessionID: null,
        diffs: [],
        expandedFiles: new Set(["src/foo.ts"]),
      }
      const action: Action = { type: "expand.all" }

      const result = reducer(state, action)

      expect(result.expandedFiles.size).toBe(0)
    })
  })

  describe("collapse.all action", () => {
    it("should clear all expanded files", () => {
      const state: AppState = {
        sessionID: null,
        diffs: mockDiffs,
        expandedFiles: new Set(["src/foo.ts", "src/bar.ts"]),
      }
      const action: Action = { type: "collapse.all" }

      const result = reducer(state, action)

      expect(result.expandedFiles.size).toBe(0)
    })

    it("should handle collapsing already empty expandedFiles", () => {
      const state: AppState = {
        sessionID: null,
        diffs: mockDiffs,
        expandedFiles: new Set(),
      }
      const action: Action = { type: "collapse.all" }

      const result = reducer(state, action)

      expect(result.expandedFiles.size).toBe(0)
    })
  })

  describe("toggle.all action", () => {
    it("should collapse all when all files are expanded", () => {
      const state: AppState = {
        sessionID: null,
        diffs: mockDiffs,
        expandedFiles: new Set(["src/foo.ts", "src/bar.ts"]),
      }
      const action: Action = { type: "toggle.all" }

      const result = reducer(state, action)

      expect(result.expandedFiles.size).toBe(0)
    })

    it("should expand all when some files are collapsed", () => {
      const state: AppState = {
        sessionID: null,
        diffs: mockDiffs,
        expandedFiles: new Set(["src/foo.ts"]),
      }
      const action: Action = { type: "toggle.all" }

      const result = reducer(state, action)

      expect(result.expandedFiles.has("src/foo.ts")).toBe(true)
      expect(result.expandedFiles.has("src/bar.ts")).toBe(true)
      expect(result.expandedFiles.size).toBe(2)
    })

    it("should expand all when no files are expanded", () => {
      const state: AppState = {
        sessionID: null,
        diffs: mockDiffs,
        expandedFiles: new Set(),
      }
      const action: Action = { type: "toggle.all" }

      const result = reducer(state, action)

      expect(result.expandedFiles.has("src/foo.ts")).toBe(true)
      expect(result.expandedFiles.has("src/bar.ts")).toBe(true)
      expect(result.expandedFiles.size).toBe(2)
    })

    it("should expand all when expandedFiles contains extra files not in diffs", () => {
      const state: AppState = {
        sessionID: null,
        diffs: mockDiffs,
        expandedFiles: new Set(["src/foo.ts", "src/bar.ts", "src/extra.ts"]),
      }
      const action: Action = { type: "toggle.all" }

      // expandedFiles.size (3) !== diffs.length (2), so not "all expanded"
      // should expand all from diffs
      const result = reducer(state, action)

      expect(result.expandedFiles.has("src/foo.ts")).toBe(true)
      expect(result.expandedFiles.has("src/bar.ts")).toBe(true)
      expect(result.expandedFiles.size).toBe(2)
    })

    it("should handle toggle.all with empty diffs", () => {
      const state: AppState = {
        sessionID: null,
        diffs: [],
        expandedFiles: new Set(),
      }
      const action: Action = { type: "toggle.all" }

      const result = reducer(state, action)

      expect(result.expandedFiles.size).toBe(0)
    })
  })

  describe("unknown action", () => {
    it("should return state unchanged for unknown action type", () => {
      const state: AppState = {
        sessionID: "session-1",
        diffs: mockDiffs,
        expandedFiles: new Set(["src/foo.ts"]),
      }
      const action = { type: "unknown.action" } as unknown as Action

      const result = reducer(state, action)

      expect(result).toBe(state)
    })
  })

  describe("initialState", () => {
    it("should have correct default values", () => {
      expect(initialState.sessionID).toBeNull()
      expect(initialState.diffs).toEqual([])
      expect(initialState.expandedFiles).toBeInstanceOf(Set)
      expect(initialState.expandedFiles.size).toBe(0)
    })
  })
})
