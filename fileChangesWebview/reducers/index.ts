import type { ActionRegistry } from "./types"
import { handleInit } from "./init"
import { handleUpdate } from "./update"
import { handleFileToggle } from "./file-toggle"
import { handleFileExpand } from "./file-expand"
import { handleFileCollapse } from "./file-collapse"
import { handleExpandAll } from "./expand-all"
import { handleCollapseAll } from "./collapse-all"
import { handleToggleAll } from "./toggle-all"

export * from "./types"

export const actionRegistry: ActionRegistry = {
  init: handleInit as ActionRegistry[string],
  update: handleUpdate as ActionRegistry[string],
  "file.toggle": handleFileToggle as ActionRegistry[string],
  "file.expand": handleFileExpand as ActionRegistry[string],
  "file.collapse": handleFileCollapse as ActionRegistry[string],
  "expand.all": handleExpandAll as ActionRegistry[string],
  "collapse.all": handleCollapseAll as ActionRegistry[string],
  "toggle.all": handleToggleAll as ActionRegistry[string],
}
