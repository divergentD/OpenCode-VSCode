import { marked } from "marked"
import DOMPurify from "dompurify"
import { refractor } from "../../packages/ui/src/file-diff/syntaxHighlight"

interface HastNode {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function hastToHtml(node: HastNode): string {
  if (!node) return ""

  if (node.type === "text") {
    return escapeHtml(node.value ?? "")
  }

  if (node.type === "element") {
    const tag = node.tagName ?? "span"
    const props = node.properties ?? {}
    const attrs = Object.entries(props)
      .map(([key, value]) => {
        if (value == null || value === false) return ""
        const attrName = key === "className" ? "class" : key
        if (value === true) {
          return ` ${attrName}`
        }
        let attrValue: string
        if (Array.isArray(value)) {
          attrValue = value.join(" ")
        } else {
          attrValue = String(value)
        }
        return ` ${attrName}="${attrValue.replace(/"/g, "&quot;")}"`
      })
      .filter(Boolean)
      .join("")
    const children = (node.children ?? []).map(hastToHtml).join("")
    return `<${tag}${attrs}>${children}</${tag}>`
  }

  if (node.type === "root") {
    return (node.children ?? []).map(hastToHtml).join("")
  }

  return ""
}

const renderer = new marked.Renderer()

renderer.code = ({ text, lang }: { text: string; lang?: string; escaped?: boolean }) => {
  const language = lang || "text"
  let highlighted: string

  try {
    if (refractor.registered(language)) {
      const ast = refractor.highlight(text, language)
      highlighted = hastToHtml(ast as HastNode)
    } else {
      highlighted = escapeHtml(text)
    }
  } catch {
    highlighted = escapeHtml(text)
  }

  return `<pre><code class="language-${language}">${highlighted}</code></pre>`
}

marked.use({
  gfm: true,
  breaks: false,
  renderer,
})

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "ul", "ol", "li",
  "strong", "em", "b", "i", "s", "del", "ins",
  "a", "img",
  "code", "pre",
  "blockquote",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span",
  "sup", "sub",
  "dl", "dt", "dd",
]

const ALLOWED_ATTR = ["href", "src", "alt", "title", "class"]

export function renderMarkdown(text: string): string {
  if (!text) return ""

  const html = marked.parse(text, { async: false }) as string

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}
