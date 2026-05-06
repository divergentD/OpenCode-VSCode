import React, { useState } from "react"
import "./TodoList.css"
import type { TodoItem, TodoStatus, WebviewMessage } from "../types"
import { ChevronDownIcon, ChevronRightIcon } from "@packages/ui/primitives/Icon"

type Props = {
  todos: TodoItem[]
  sessionID: string | null
  post: (msg: WebviewMessage) => void
  isVisible: boolean
}

function getStatusIcon(status: TodoStatus): string {
  switch (status) {
    case "pending":
      return "○"
    case "in_progress":
      return "◐"
    case "completed":
      return "✓"
    default:
      return "○"
  }
}

function getStatusClass(status: TodoStatus): string {
  switch (status) {
    case "pending":
      return "todo-status-pending"
    case "in_progress":
      return "todo-status-progress"
    case "completed":
      return "todo-status-completed"
    default:
      return "todo-status-pending"
  }
}

export function TodoList({ todos, sessionID, post, isVisible }: Props) {
  const [expanded, setExpanded] = useState(true)
  const unfinishedTodos = todos.filter((t) => t.status !== "completed")

  console.log('[TodoList Debug] isVisible:', isVisible)
  console.log('[TodoList Debug] sessionID:', sessionID)
  console.log('[TodoList Debug] total todos:', todos.length)
  console.log('[TodoList Debug] unfinished todos:', unfinishedTodos.length)
  console.log('[TodoList Debug] all todos data:', todos)

  if (!isVisible || todos.length === 0) {
    return null
  }

  const handleStatusToggle = (todo: TodoItem) => {
    const newStatus: TodoStatus = todo.status === "completed" ? "pending" : "completed"
    post({
      type: "todo.update",
      todoID: todo.id,
      updates: { status: newStatus },
    })
  }

  const handleDelete = (todoID: string) => {
    post({ type: "todo.delete", todoID })
  }

  return (
    <div className="todo-list-container">
      <div 
        className="todo-list-header" 
        onClick={() => setExpanded(!expanded)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(!expanded)
          }
        }}
      >
        <div className="todo-list-header-left">
          {expanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
          <span className="todo-list-title">Todos</span>
        </div>
        <span className="todo-list-count">{todos.length}</span>
      </div>
      {expanded && (
        <div className="todo-list-scroll">
          {todos.map((todo) => (
            <div key={todo.id} className={`todo-item ${getStatusClass(todo.status)}`}>
              <button
                className="todo-status-btn"
                onClick={() => handleStatusToggle(todo)}
                title={todo.status}
              >
                {getStatusIcon(todo.status)}
              </button>
              <div className="todo-content">
                <div className="todo-title">{todo.title}</div>
                {todo.description && (
                  <div className="todo-description">{todo.description}</div>
                )}
              </div>
              <button
                className="todo-delete-btn"
                onClick={() => handleDelete(todo.id)}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
