import React, { createContext, useContext, useEffect, useState } from "react"

type ThemeKind = "light" | "dark" | "highContrast" | "highContrastLight"

interface VSCodeThemeContextType {
  theme: ThemeKind
}

const VSCodeThemeContext = createContext<VSCodeThemeContextType>({ theme: "dark" })

export const useVSCodeTheme = () => useContext(VSCodeThemeContext)

export const VSCodeThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeKind>("dark")

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "theme.changed") {
        setTheme(event.data.theme.kind)
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  return (
    <VSCodeThemeContext.Provider value={{ theme }}>
      {children}
    </VSCodeThemeContext.Provider>
  )
}
