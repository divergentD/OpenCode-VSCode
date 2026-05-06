import { spawn } from "child_process"

export type ServerHandle = {
  url: string
  spawned: boolean
  dispose(): void
}

function terminateProcessTree(pid: number | undefined): void {
  if (!pid) return

  if (process.platform === "win32") {
    // On Windows, kill the full process tree to avoid orphaned child processes.
    const killer = spawn("taskkill", ["/pid", String(pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    })
    killer.on("error", () => {})
    return
  }

  try {
    process.kill(pid, "SIGTERM")
  } catch {
    // Process already exited.
  }
}

async function probe(port: number): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000)
  try {
    const response = await fetch(`http://localhost:${port}/global/health`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    clearTimeout(timeout)
    return false
  }
}

function randomPort(): number {
  return Math.floor(Math.random() * (65535 - 16384 + 1)) + 16384
}

export async function connect(signal: AbortSignal): Promise<ServerHandle> {
  if (await probe(4096)) {
    return {
      url: "http://localhost:4096",
      spawned: false,
      dispose: () => {},
    }
  }

  const port = randomPort()
  const args = ["serve", "--port", port.toString()]
  const proc = spawn("opencode", args, {
    stdio: ["ignore", "pipe", "pipe"],
  })
  let disposed = false
  const disposeProcess = () => {
    if (disposed) return
    disposed = true
    terminateProcessTree(proc.pid)
  }

  const url = await new Promise<string>((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      disposeProcess()
      reject(new Error("Timeout waiting for server to start after 15 seconds"))
    }, 15000)

    let output = ""
    const onStdout = (chunk: Buffer) => {
      output += chunk.toString()
      const lines = output.split("\n")
      for (const line of lines) {
        if (line.includes("opencode server listening")) {
          const match = line.match(/on\s+(https?:\/\/[^\s]+)/)
          if (match) {
            if (settled) return
            settled = true
            cleanup()
            resolve(match[1])
            return
          }
        }
      }
    }
    proc.stdout?.on("data", onStdout)

    const onStderr = (chunk: Buffer) => {
      output += chunk.toString()
    }
    proc.stderr?.on("data", onStderr)

    const onExit = (code: number | null) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(`Server exited with code ${code}. Output: ${output}`))
    }
    proc.on("exit", onExit)

    const onError = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }
    proc.on("error", onError)

    const onAbort = () => {
      if (settled) return
      settled = true
      cleanup()
      disposeProcess()
      reject(new Error("Aborted"))
    }

    const cleanup = () => {
      clearTimeout(timeout)
      proc.stdout?.off("data", onStdout)
      proc.stderr?.off("data", onStderr)
      proc.off("exit", onExit)
      proc.off("error", onError)
      signal.removeEventListener("abort", onAbort)
    }

    if (signal.aborted) {
      onAbort()
    } else {
      signal.addEventListener("abort", onAbort, { once: true })
    }
  })

  if (signal.aborted) {
    disposeProcess()
    throw new Error("Aborted")
  }

  return {
    url,
    spawned: true,
    dispose: () => disposeProcess(),
  }
}
