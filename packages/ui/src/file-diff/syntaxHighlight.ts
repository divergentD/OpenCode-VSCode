import refractor from "refractor/core"
import bash from "refractor/lang/bash"
import c from "refractor/lang/c"
import clike from "refractor/lang/clike"
import cpp from "refractor/lang/cpp"
import csharp from "refractor/lang/csharp"
import css from "refractor/lang/css"
import docker from "refractor/lang/docker"
import go from "refractor/lang/go"
import graphql from "refractor/lang/graphql"
import java from "refractor/lang/java"
import json from "refractor/lang/json"
import jsx from "refractor/lang/jsx"
import kotlin from "refractor/lang/kotlin"
import less from "refractor/lang/less"
import markdown from "refractor/lang/markdown"
import markup from "refractor/lang/markup"
import php from "refractor/lang/php"
import python from "refractor/lang/python"
import ruby from "refractor/lang/ruby"
import rust from "refractor/lang/rust"
import scss from "refractor/lang/scss"
import sql from "refractor/lang/sql"
import swift from "refractor/lang/swift"
import toml from "refractor/lang/toml"
import tsx from "refractor/lang/tsx"
import typescript from "refractor/lang/typescript"
import yaml from "refractor/lang/yaml"

refractor.register(clike)
refractor.register(jsx)
refractor.register(typescript)
refractor.register(tsx)
refractor.register(css)
refractor.register(scss)
refractor.register(less)
refractor.register(markup)
refractor.register(json)
refractor.register(markdown)
refractor.register(python)
refractor.register(rust)
refractor.register(go)
refractor.register(bash)
refractor.register(yaml)
refractor.register(toml)
refractor.register(sql)
refractor.register(c)
refractor.register(cpp)
refractor.register(csharp)
refractor.register(java)
refractor.register(php)
refractor.register(ruby)
refractor.register(docker)
refractor.register(graphql)
refractor.register(swift)
refractor.register(kotlin)

const EXTENSION_MAP: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",
  styl: "stylus",
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  vue: "markup",
  svelte: "markup",
  json: "json",
  md: "markdown",
  mdx: "markdown",
  py: "python",
  pyi: "python",
  rs: "rust",
  go: "go",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  sql: "sql",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  java: "java",
  php: "php",
  rb: "ruby",
  dockerfile: "docker",
  gql: "graphql",
  graphql: "graphql",
  swift: "swift",
  kt: "kotlin",
  kts: "kotlin",
}

export function detectLanguage(filePath: string): string | null {
  const ext = filePath.split(".").pop()?.toLowerCase()
  if (!ext) return null
  return EXTENSION_MAP[ext] || null
}

export { refractor }
