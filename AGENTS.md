# Agent 指令：VS Code 扩展

opencode 的 AI 驱动的 VS Code: 聊天界面扩展。

## 构建命令

```bash
# 构建扩展和 webview
npm run build

# 构建/监听特定目标
npm run build:extension    # 仅扩展主机
npm run build:webview      # 仅 webview
npm run watch              # 监听两者
npm run watch:extension    # 监听扩展
npm run watch:webview      # 监听 webview

# 生产构建
npm run package
```

**注意：** 未配置测试运行器。此扩展通过 VS Code: 扩展主机进行手动测试。

## 架构

- **扩展主机 (Node.js)**：`src/` - TypeScript，CJS 格式
  - `extension.ts` - 入口点，注册提供程序/命令
  - `provider.ts` - WebviewViewProvider，处理 VS Code: ↔ Webview 通信
  - `server.ts` - 本地服务器连接管理
  - `mentions.ts` - 上下文解析（选择、问题、终端）
  - `types.ts` - 消息类型定义

- **Webview (浏览器/React)**：`webview/` - TypeScript/TSX，IIFE 格式
  - `index.tsx` - React 入口点
  - `App.tsx` - 根组件，处理消息
  - `state.ts` - 基于 Reducer 的状态管理
  - `components/` - React 组件（ChatPanel、MessageList、PromptInput 等）

## 代码风格

### TypeScript

- **目标**：ES2022（扩展），ES2020 + DOM（webview）
- **模块**：NodeNext（扩展），ESNext（webview）
- **严格模式**：启用
- **分号**：省略（根据根目录 prettier 配置）
- **打印宽度**：120 字符
- **引号**：双引号

### 导入

```typescript
// 外部模块在前
import * as vscode from "vscode"
import * as path from "path"
import React, { useState } from "react"

// 内部模块
import { ChatProvider } from "./provider"
import type { HostMessage } from "./types"
```

### 命名约定

- **类**：`PascalCase`（例如：`ChatProvider`、`MentionResolver`）
- **接口/类型**：`PascalCase`（例如：`HostMessage`、`AppState`）
- **函数**：`camelCase`（例如：`resolveSelection`、`handleMessage`）
- **变量**：`camelCase`（例如：`activeSessionID`、`partDeltas`）
- **常量**：`camelCase` 或 `SCREAMING_SNAKE`（真正的常量）
- **私有方法**：使用 `private` 关键字前缀，`camelCase`
- **React 组件**：`PascalCase` 函数

### 类型模式

```typescript
// 消息的可辨识联合
type HostMessage =
  | { type: "server.ready"; url: string }
  | { type: "server.error"; message: string }

// Redux 风格的操作
type Action =
  | { type: "sessions.list"; sessions: SessionInfo[] }
  | { type: "session.created"; session: SessionInfo }

// 可选链和空值合并
const status = state.sessionStatuses[sessionID] ?? "idle"
```

### 错误处理

```typescript
// 使用类型守卫进行错误处理
catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  console.error("[opencode] 错误：", msg)
}

// 向 webview 发送错误
this.post({ type: "server.error", message: msg })
```

### React 模式

```typescript
// 复杂状态使用 useReducer
const [state, dispatch] = useReducer(reducer, initialState)

// useCallback 用于传递给子组件的稳定回调
const post = useCallback((msg: WebviewMessage) => vscode.postMessage(msg), [])

// 状态的功能性更新
setShowSessions((prev) => !prev)
```

## 关键依赖

- `vscode` - 扩展 API（外部）
- `react`、`react-dom` - Webview UI
- `@opencode-ai/sdk` - 工作区依赖，API 客户端
- `marked`、`dompurify` - Markdown 渲染

## 开发说明

- 扩展通过 `postMessage` 与 webview 通信
- Webview 使用 `acquireVsCodeApi()` 作为 VS Code: 桥接
- 无独立的 lint/format 脚本 - 依赖根 monorepo 配置
- 扩展在 `onView:opencode.chat` 时激活
