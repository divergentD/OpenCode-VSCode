import { spawn } from "child_process"

export type ServerHandle = {
  url: string
  spawned: boolean
  dispose(): void
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

  if (signal) {
    signal.addEventListener("abort", () => proc.kill())
  }

  const url = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      proc.kill()
      reject(new Error("Timeout waiting for server to start after 15 seconds"))
    }, 15000)

    let output = ""
    proc.stdout?.on("data", (chunk) => {
      output += chunk.toString()
      const lines = output.split("\n")
      for (const line of lines) {
        if (line.includes("opencode server listening")) {
          const match = line.match(/on\s+(https?:\/\/[^\s]+)/)
          if (match) {
            clearTimeout(timeout)
            resolve(match[1])
            return
          }
        }
      }
    })

    proc.stderr?.on("data", (chunk) => {
      output += chunk.toString()
    })

    proc.on("exit", (code) => {
      clearTimeout(timeout)
      reject(new Error(`Server exited with code ${code}. Output: ${output}`))
    })

    proc.on("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timeout)
        reject(new Error("Aborted"))
      })
    }
  })

  return {
    url,
    spawned: true,
    dispose: () => proc.kill(),
  }
}
