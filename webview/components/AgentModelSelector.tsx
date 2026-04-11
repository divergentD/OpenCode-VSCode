import React, { useState, useRef, useEffect, useMemo } from "react"
import type { AgentInfo, ProviderInfo } from "../types"
import { ProviderIcon } from "./ProviderIcon"

type Props = {
  agents: AgentInfo[]
  providers: ProviderInfo[]
  selectedAgent: string | null
  selectedModel: string | null
  onAgentChange: (agentID: string | null) => void
  onModelChange: (modelID: string | null) => void
  disabled?: boolean
}

type ModelInfo = {
  id: string
  modelId: string
  name: string
  provider: string
  providerId: string
}

export function AgentModelSelector({
  agents,
  providers,
  selectedAgent,
  selectedModel,
  onAgentChange,
  onModelChange,
  disabled = false,
}: Props) {
  const [agentQuery, setAgentQuery] = useState("")
  const [modelQuery, setModelQuery] = useState("")
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false)
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const agentDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const agentButtonRef = useRef<HTMLButtonElement>(null)
  const modelButtonRef = useRef<HTMLButtonElement>(null)

  const allModels = useMemo(() => {
    const models: ModelInfo[] = []
    const providerList = Array.isArray(providers) ? providers : []
    for (const provider of providerList) {
      if (provider.models) {
        // Handle both object and array formats from backend
        const modelEntries = Array.isArray(provider.models)
          ? provider.models.map((m, i) => [m.id || String(i), m] as [string, { id?: string; name?: string }])
          : Object.entries(provider.models as Record<string, { id?: string; name?: string }>)
        
        for (const [modelId, model] of modelEntries) {
          const actualId = model.id || modelId
          models.push({
            id: `${provider.id}:${actualId}`,
            modelId: actualId,
            name: model.name || actualId,
            provider: provider.name,
            providerId: provider.id,
          })
        }
      }
    }
    return models
  }, [providers])

  const filteredAgents = useMemo(() => {
    const primaryAgents = agents.filter((a) => a.mode === "primary" || a.mode === "all")
    if (!agentQuery.trim()) return primaryAgents
    const query = agentQuery.toLowerCase()
    return primaryAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        (a.description?.toLowerCase() ?? "").includes(query)
    )
  }, [agents, agentQuery])

  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {}
    for (const model of allModels) {
      if (!groups[model.provider]) {
        groups[model.provider] = []
      }
      groups[model.provider].push(model)
    }
    return groups
  }, [allModels])

  const filteredGroups = useMemo(() => {
    if (!modelQuery.trim()) return groupedModels
    const query = modelQuery.toLowerCase()
    const filtered: Record<string, ModelInfo[]> = {}
    for (const [provider, models] of Object.entries(groupedModels)) {
      const matchingModels = models.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query) ||
          m.modelId.toLowerCase().includes(query)
      )
      if (matchingModels.length > 0) {
        filtered[provider] = matchingModels
      }
    }
    return filtered
  }, [groupedModels, modelQuery])

  const selectedAgentInfo = useMemo(() => {
    if (!selectedAgent) return null
    return agents.find((a) => a.name === selectedAgent)
  }, [selectedAgent, agents])

  const selectedModelInfo = useMemo(() => {
    if (!selectedModel) return null
    return allModels.find((m) => m.id === selectedModel)
  }, [selectedModel, allModels])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        agentDropdownRef.current &&
        !agentDropdownRef.current.contains(event.target as Node) &&
        !agentButtonRef.current?.contains(event.target as Node)
      ) {
        setIsAgentDropdownOpen(false)
      }
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node) &&
        !modelButtonRef.current?.contains(event.target as Node)
      ) {
        setIsModelDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleAgentSelect = (agentId: string) => {
    onAgentChange(agentId)
    setIsAgentDropdownOpen(false)
    setAgentQuery("")

    // 联动：根据 agent 的 model 配置自动选择模型
    const agent = agents.find((a) => a.name === agentId)
    if (agent?.model) {
      const matchedModel = allModels.find(
        (m) => m.modelId === agent.model!.modelID && m.providerId === agent.model!.providerID
      )
      if (matchedModel) {
        onModelChange(matchedModel.id)
      }
    }
  }

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId)
    setIsModelDropdownOpen(false)
    setModelQuery("")
  }

  return (
    <>
      <div className="selector-wrapper" ref={agentDropdownRef}>
        <button
          ref={agentButtonRef}
          type="button"
          onClick={() => {
            setIsAgentDropdownOpen(!isAgentDropdownOpen)
            setIsModelDropdownOpen(false)
          }}
          disabled={disabled || agents.length === 0}
          className={`selector-button ${isAgentDropdownOpen ? "open" : ""}`}
          title={selectedAgentInfo ? selectedAgentInfo.name : "Select Agent"}
        >
          <span className="selector-button-content">
            <span className="selector-button-text">
              {selectedAgentInfo ? selectedAgentInfo.name : agents.length === 0 ? "No agents" : "Agent"}
            </span>
          </span>
          <svg
            className={`selector-button-arrow ${isAgentDropdownOpen ? "open" : ""}`}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isAgentDropdownOpen && (
          <div className="selector-dropdown agent-dropdown">
            <div className="selector-dropdown-search">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 13L9.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input type="text" placeholder="Search agents..." value={agentQuery} onChange={(e) => setAgentQuery(e.target.value)} autoFocus/>
              {agentQuery && (
                <button className="clear-search" onClick={() => setAgentQuery("")} type="button">×</button>
              )}
            </div>

            <div className="selector-dropdown-list agent-list">
              {filteredAgents.length === 0 ? (
                <div className="selector-dropdown-empty">No agents found</div>
              ) : (
                filteredAgents.map((agent) => (
                  <button key={agent.name} type="button" className={`selector-option ${selectedAgent === agent.name ? "selected" : ""}`} onClick={() => handleAgentSelect(agent.name)}>
                    <span className="selector-option-name">{agent.name}</span>
                    {selectedAgent === agent.name && (
                      <svg className="check-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="selector-wrapper" ref={modelDropdownRef}>
        <button
          ref={modelButtonRef}
          type="button"
          onClick={() => {
            setIsModelDropdownOpen(!isModelDropdownOpen)
            setIsAgentDropdownOpen(false)
          }}
          disabled={disabled || allModels.length === 0}
          className={`selector-button ${isModelDropdownOpen ? "open" : ""}`}
          title={selectedModelInfo ? selectedModelInfo.name : "Select Model"}
        >
          <span className="selector-button-content">
            {selectedModelInfo && (
              <ProviderIcon providerId={selectedModelInfo.providerId} providerName={selectedModelInfo.provider} size={16} />
            )}
            <span className="selector-button-text">
              {selectedModelInfo ? selectedModelInfo.name : allModels.length === 0 ? "No models" : "Model"}
            </span>
          </span>
          <svg
            className={`selector-button-arrow ${isModelDropdownOpen ? "open" : ""}`}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isModelDropdownOpen && (
          <div className="selector-dropdown model-dropdown">
            <div className="selector-dropdown-search">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 13L9.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input type="text" placeholder="Search models..." value={modelQuery} onChange={(e) => setModelQuery(e.target.value)} autoFocus/>
              {modelQuery && (
                <button className="clear-search" onClick={() => setModelQuery("")} type="button">×</button>
              )}
            </div>

            <div className="selector-dropdown-list model-list">
              {Object.entries(filteredGroups).length === 0 ? (
                <div className="selector-dropdown-empty">No models found</div>
              ) : (
                Object.entries(filteredGroups).map(([provider, models]) => (
                  <div key={provider} className="model-group">
                    <div className="model-group-header">{provider}</div>
                    {models.map((model) => (
                      <button key={model.id} type="button" className={`selector-option ${selectedModel === model.id ? "selected" : ""}`} onClick={() => handleModelSelect(model.id)}>
                        <span className="selector-option-name">{model.name}</span>
                        {selectedModel === model.id && (
                          <svg className="check-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}