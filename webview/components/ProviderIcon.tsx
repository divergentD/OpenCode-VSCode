import React, { useState, useEffect, useCallback } from "react"

const ICONS_BASE_URL = "https://models.dev/logos"
const ICON_CACHE_KEY_PREFIX = "opencode:provider:icon:"
const ICON_CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

type CacheEntry = {
  svg: string
  timestamp: number
}

function getCachedIcon(providerId: string): string | null {
  try {
    const key = `${ICON_CACHE_KEY_PREFIX}${providerId}`
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const entry: CacheEntry = JSON.parse(cached)
    if (Date.now() - entry.timestamp > ICON_CACHE_EXPIRY_MS) {
      localStorage.removeItem(key)
      return null
    }
    return entry.svg
  } catch {
    return null
  }
}

function setCachedIcon(providerId: string, svg: string) {
  try {
    const key = `${ICON_CACHE_KEY_PREFIX}${providerId}`
    const entry: CacheEntry = { svg, timestamp: Date.now() }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // localStorage quota exceeded or disabled
  }
}

type Props = {
  providerId: string
  providerName: string
  className?: string
  size?: number
}

export function ProviderIcon({ providerId, providerName, className = "", size = 16 }: Props) {
  const [svgContent, setSvgContent] = useState<string | null>(() =>
    getCachedIcon(providerId)
  )
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(!getCachedIcon(providerId))

  const fetchIcon = useCallback(async () => {
    const cached = getCachedIcon(providerId)
    if (cached) {
      setSvgContent(cached)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${ICONS_BASE_URL}/${providerId}.svg`)
      if (!response.ok) {
        throw new Error(`Failed to fetch icon: ${response.status}`)
      }
      const svg = await response.text()

      if (!svg.includes("<svg") || !svg.includes("</svg>")) {
        throw new Error("Invalid SVG content")
      }

      setCachedIcon(providerId, svg)
      setSvgContent(svg)
      setHasError(false)
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [providerId])

  useEffect(() => {
    if (!svgContent && !hasError) {
      fetchIcon()
    }
  }, [svgContent, hasError, fetchIcon])

  const fallbackStyle: React.CSSProperties = {
    width: size,
    height: size,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: size * 0.6,
    fontWeight: 600,
    textTransform: "uppercase",
    borderRadius: "4px",
    backgroundColor: "var(--vscode-button-secondaryBackground, #3c3c3c)",
    color: "var(--vscode-button-secondaryForeground, #cccccc)",
  }

  const loadingStyle: React.CSSProperties = {
    width: size,
    height: size,
    display: "inline-block",
    borderRadius: "4px",
    backgroundColor: "var(--vscode-button-secondaryBackground, #3c3c3c)",
    opacity: 0.5,
  }

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }

  if (hasError || (!svgContent && !isLoading)) {
    return (
      <span className={`provider-icon-fallback ${className}`} style={fallbackStyle}>
        {providerName.charAt(0)}
      </span>
    )
  }

  if (isLoading || !svgContent) {
    return <span className={`provider-icon-loading ${className}`} style={loadingStyle} />
  }

  return (
    <span
      className={`provider-icon ${className}`}
      style={containerStyle}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}
