import type { AppState } from "../state"
import type { QuestionRequest } from "../types"
import type { EventHandler } from "./types"

export const handleQuestionAsked: EventHandler<{
  id: string
  message: string
  options?: string[]
}> = (state, { id, message, options }) => {
  const req: QuestionRequest = { requestID: id, question: message, options }
  return {
    ...state,
    questions: [...state.questions, req],
  }
}

export const handleQuestionAnswered: EventHandler<{ id: string }> = (
  state,
  { id }
) => ({
  ...state,
  questions: state.questions.filter((q) => q.requestID !== id),
})