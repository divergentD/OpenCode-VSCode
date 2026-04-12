import React from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "./styles/index.css"
import "./components/ChatPanel.css"
import "./components/SessionDrawer.css"
import "./components/MessageList.css"
import "./components/MessageBubble.css"
import "./components/TodoList.css"
import "./components/PromptInput.css"
import "./components/MentionMenu.css"
import "./components/CommandMenu.css"
import "./components/AgentModelSelector.css"

const el = document.getElementById("root")!
createRoot(el).render(<App />)
