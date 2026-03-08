import React from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "./styles/index.css"

const el = document.getElementById("root")!
createRoot(el).render(<App />)
