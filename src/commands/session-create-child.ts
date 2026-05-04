import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionCreateChildCommand implements Command {
  readonly type = "session.createChild"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { parentID: string }): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    const parentResult = await client.session.get({ 
      path: { id: msg.parentID },
      query: { directory }
    })
    
    const parentTitle = parentResult.data?.title || "Parent Session"
    const childTitle = `Sub-session of ${parentTitle}`

    const result = await client.session.create({
      query: { directory },
      body: { 
        parentID: msg.parentID,
        title: childTitle
      }
    })

    if (result.data) {
      dispatcher.postMessage({ type: "session.created", session: result.data })
    }
  }
}
