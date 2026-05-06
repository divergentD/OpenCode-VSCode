import { EventEmitter } from "events"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { connect } from "./server"

type FakeProcess = EventEmitter & {
  pid: number
  stdout?: EventEmitter
  stderr?: EventEmitter
}

const spawnMock = vi.fn()

vi.mock("child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}))

describe("server connect/dispose", () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true,
    })
  })

  it("kills the full spawned process tree on dispose in windows", async () => {
    const proc = new EventEmitter() as FakeProcess
    proc.pid = 4321
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()

    const killer = new EventEmitter() as FakeProcess
    killer.pid = 9999

    spawnMock.mockImplementation((command: string) => {
      if (command === "opencode") {
        setTimeout(() => {
          proc.stdout?.emit("data", Buffer.from("opencode server listening on http://localhost:12345\n"))
        }, 0)
        return proc
      }
      return killer
    })

    const handle = await connect(new AbortController().signal)
    handle.dispose()

    expect(spawnMock).toHaveBeenNthCalledWith(
      2,
      "taskkill",
      ["/pid", "4321", "/t", "/f"],
      expect.objectContaining({ stdio: "ignore", windowsHide: true }),
    )
  })

  it("does not spawn process when default server is already running", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }))

    const handle = await connect(new AbortController().signal)

    expect(handle.spawned).toBe(false)
    expect(spawnMock).not.toHaveBeenCalled()
  })

  afterAll(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    })
  })
})
