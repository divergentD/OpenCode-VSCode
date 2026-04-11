import type { EventRegistry, EventHandlerChain } from "./types"
import {
  handleMessageUpdated,
  handleMessagePartUpdated,
  handleMessagePartDelta,
} from "./message-events"
import { handlePermissionAsked, handlePermissionReplied } from "./permission-events"
import { handleQuestionAsked, handleQuestionAnswered } from "./question-events"
import {
  handleSessionStatus,
  handleSessionUpdated,
  handleSessionDiff,
} from "./session-events"

export const eventHandlers: EventRegistry = {
  "message.updated": handleMessageUpdated as EventRegistry[string],
  "message.part.updated": handleMessagePartUpdated as EventRegistry[string],
  "message.part.delta": handleMessagePartDelta as EventRegistry[string],
  "permission.asked": handlePermissionAsked as EventRegistry[string],
  "permission.replied": handlePermissionReplied as EventRegistry[string],
  "question.asked": handleQuestionAsked as EventRegistry[string],
  "question.answered": handleQuestionAnswered as EventRegistry[string],
  "session.status": handleSessionStatus as EventRegistry[string],
  "session.updated": handleSessionUpdated as EventRegistry[string],
  "session.diff": handleSessionDiff as EventRegistry[string],
}

export function createEventHandlerChain(): EventHandlerChain {
  return (state, eventType, properties) => {
    const handler = eventHandlers[eventType]
    if (handler) {
      return handler(state, properties)
    }
    return state
  }
}
