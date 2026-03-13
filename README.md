# opencode Chat

![VS Code:](https://img.shields.io/badge/VS%20Code:-1.94.0+-blue?style=flat-square&logo=visual-studio-code)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)

opencode Chat 是一个为 VS Code: 设计的 AI 驱动聊天界面扩展，让你在编辑器中直接与 AI 助手对话。

## ✨ 功能特性

- **💬 智能对话** - 在 VS Code: 侧边栏中与 AI 进行自然语言对话
- **📎 上下文感知** - 支持添加代码选择、问题诊断、终端输出作为对话上下文
- **📝 会话管理** - 创建多个独立会话，随时切换和查看历史记录
- **⚡ 流式响应** - 实时接收 AI 回复，支持 Markdown 渲染和代码高亮
- **🔐 权限控制** - 智能权限请求系统，安全执行需要授权的操作
- **🔍 代码引用** - 使用 `@` 符号快速引用文件和符号
- **⌨️ 快捷键支持** - 使用 `Cmd/Ctrl + Shift + O` 快速聚焦聊天窗口

## 📦 安装

### 开发模式

```bash
# 克隆仓库
git clone https://github.com/anomalyco/opencode.git
cd opencode/packages/vscode

# 安装依赖
npm install

# 构建扩展
npm run build
```

在 VS Code: 中按 `F5` 打开扩展开发主机进行测试。

### 生产打包

```bash
npm run package
```

生成的 `.vsix` 文件可以通过 VS Code: 的 "从 VSIX 安装" 功能安装。

## 🚀 使用方法

1. **打开聊天** - 点击活动栏中的 opencode 图标或使用快捷键 `Cmd/Ctrl + Shift + O`
2. **创建新会话** - 点击 "+" 按钮或使用命令 `opencode: New Session`
3. **发送消息** - 在输入框中输入问题，按回车发送
4. **添加上下文** - 使用 `@` 符号引用文件、代码选择或问题
5. **查看历史** - 点击 "History" 按钮查看和管理历史会话

### 支持的上下文类型

- **@selection** - 引用当前选中的代码
- **@problems** - 引用当前文件中的诊断问题
- **@terminal** - 引用终端中的最新输出
- **@files** - 搜索并引用项目文件
- **@symbols** - 搜索并引用代码符号

### 可用命令

| 命令 | 标题 | 快捷键 |
|------|------|--------|
| `opencode.newSession` | opencode: 新建会话 | - |
| `opencode.focus` | opencode: 聚焦聊天 | `Cmd/Ctrl + Shift + O` |
| `opencode.attachSelection` | opencode: 附加选择 | - |

## 🏗️ 技术架构

本扩展采用双层架构设计：

### 扩展主机层 (Node.js)
位于 `src/` 目录，使用 CommonJS 格式：

- **extension.ts** - 扩展入口，注册提供程序和命令
- **provider.ts** - WebviewViewProvider，处理 VS Code: ↔ Webview 通信
- **server.ts** - 本地服务器连接管理
- **mentions.ts** - 上下文解析（代码选择、问题、终端）
- **types.ts** - TypeScript 类型定义

### Webview 层 (React)
位于 `webview/` 目录，使用 ESNext 模块：

- **index.tsx** - React 应用入口
- **App.tsx** - 根组件，消息处理中心
- **state.ts** - 基于 Reducer 的状态管理
- **components/** - UI 组件（ChatPanel、MessageList、PromptInput 等）

## 🔧 开发

### 构建命令

```bash
# 完整构建
npm run build

# 仅构建扩展主机
npm run build:extension

# 仅构建 webview
npm run build:webview

# 开发模式（监听文件变化）
npm run watch
npm run watch:extension
npm run watch:webview

# 生产打包
npm run package
```

### 技术栈

- **TypeScript** - 类型安全的 JavaScript
- **React 18** - Webview UI 框架
- **esbuild** - 极速构建工具
- **VS Code: API** - 扩展功能接口
- **@opencode-ai/sdk** - opencode AI SDK

### 代码风格

- 目标：ES2022（扩展），ES2020 + DOM（webview）
- 模块：NodeNext（扩展），ESNext（webview）
- 严格模式：启用
- 分号：省略
- 打印宽度：120 字符
- 引号：双引号

更多详情参见 [AGENTS.md](./AGENTS.md)。

## 📋 系统要求

- VS Code: 1.94.0 或更高版本
- 已安装并运行的 opencode 服务器

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🔗 相关链接

- [opencode 主仓库](https://github.com/anomalyco/opencode)
- [VS Code: 扩展开发文档](https://code.visualstudio.com/api)
- [问题反馈](https://github.com/anomalyco/opencode/issues)

