import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "webview/**/*.test.ts",
      "fileChangesWebview/**/*.test.ts"
    ],
    coverage: {
      reporter: ["text", "html"],
      exclude: ["node_modules", "dist"]
    }
  }
})
