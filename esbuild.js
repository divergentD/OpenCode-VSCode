const esbuild = require("esbuild")

const production = process.argv.includes("--production")
const watch = process.argv.includes("--watch")
const target = process.argv.find((arg) => arg.startsWith("--target="))?.split("=")[1]

/**
 * Build configuration for Extension Host (Node.js)
 */
async function buildExtension() {
  console.log("Building extension host...")

  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: watch ? "silent" : "info",
  })

  if (watch) {
    await ctx.watch()
    console.log("[watch] Extension host watching...")
  } else {
    await ctx.rebuild()
    await ctx.dispose()
    console.log("✓ dist/extension.js")
  }
}

/**
 * Build configuration for Webview (Browser/React)
 */
async function buildWebview() {
  console.log("Building webview...")

  const ctx = await esbuild.context({
    entryPoints: ["webview/index.tsx"],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    outfile: "dist/webview.js",
    logLevel: watch ? "silent" : "info",
  })

  if (watch) {
    await ctx.watch()
    console.log("[watch] Webview watching...")
  } else {
    await ctx.rebuild()
    await ctx.dispose()
    console.log("✓ dist/webview.js")
    console.log("✓ dist/webview.css")
  }
}

/**
 * Build configuration for File Changes Webview (Browser/React)
 */
async function buildFileChangesWebview() {
  console.log("Building file changes webview...")

  const ctx = await esbuild.context({
    entryPoints: ["fileChangesWebview/index.tsx"],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    outfile: "dist/fileChangesWebview.js",
    logLevel: watch ? "silent" : "info",
  })

  if (watch) {
    await ctx.watch()
    console.log("[watch] File changes webview watching...")
  } else {
    await ctx.rebuild()
    await ctx.dispose()
    console.log("✓ dist/fileChangesWebview.js")
    console.log("✓ dist/fileChangesWebview.css")
  }
}

async function main() {
  try {
    const tasks = []

    if (!target || target === "extension") {
      tasks.push(buildExtension())
    }

    if (!target || target === "webview") {
      tasks.push(buildWebview())
      tasks.push(buildFileChangesWebview())
    }

    await Promise.all(tasks)

    if (!watch) {
      console.log("\n✓ Build complete!")
    }
  } catch (e) {
    console.error("Build failed:", e)
    process.exit(1)
  }
}

main()
