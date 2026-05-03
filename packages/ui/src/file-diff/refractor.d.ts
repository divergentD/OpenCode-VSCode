declare module "refractor/core" {
  interface RefractorNode {
    type: string
    tagName?: string
    properties?: {
      className?: string[]
      [key: string]: unknown
    }
    children?: RefractorNode[]
    value?: string
  }

  interface Refractor {
    highlight(value: string, language: string): RefractorNode[]
    register(syntax: unknown): void
    registered(language: string): boolean
    listLanguages(): string[]
    alias(name: string, alias: string | string[]): void
  }

  const refractor: Refractor
  export default refractor
}

declare module "refractor/lang/*" {
  const language: unknown
  export default language
}
