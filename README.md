# Lumik Agent

A general-purpose AI browser extension that can perform any task on the web through natural language commands.

## Features

- **Natural Language Commands**: Just tell it what you want to do in plain English
- **Universal Compatibility**: Works on any website
- **Powerful Actions**: Can click, type, navigate, manage tabs, download files, and more
- **Safe Architecture**: Uses predefined tools instead of executing arbitrary code
- **Smart Vision**: Automatically scans pages to understand what's interactable
- **Full TypeScript**: Complete type safety and excellent developer experience
- **LLM Integration**: Supports OpenAI-compatible APIs for intelligent decision making

## Installation & Setup

### 1. Install Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the extension folder
4. The AI Agent icon will appear in your toolbar

### 2. Configure LLM API

1. Click the AI Agent icon to open the sidebar
2. Click "Configure" in the configuration panel
3. Configure your OpenAI-compatible API
4. Enter your API key:
    - **OpenAI**: Get your key from https://platform.openai.com/api-keys
    - **Alternative providers**: Use your provider's API key
5. Optionally configure custom API URL for alternative providers
6. Select your preferred model (GPT-4o Mini recommended)
7. Click "Save Configuration"

### 3. Start Using

Once configured, just type your commands in natural language!

## Usage

1. Click the AI Agent icon to open the sidebar
2. Type your command in natural language, like:
    - "Send a tweet saying hello"
    - "Search for React tutorials"
    - "Fill out this form with my info"
    - "Download this PDF"
3. The AI will analyze the page and execute the necessary steps

## Current Status

This is **Phase 2.5** of development - Full TypeScript migration **COMPLETE**! 🎉

- ✅ Extension setup and permissions
- ✅ Sidebar chat interface (TypeScript + Svelte 5)
- ✅ Page scanning and element detection (TypeScript)
- ✅ Tool architecture (20+ predefined tools, fully typed)
- ✅ Basic DOM manipulation tools (TypeScript)
- ✅ Tab management (TypeScript)
- ✅ Navigation tools (TypeScript)
- ✅ **LLM Integration (OpenAI-compatible)**
- ✅ **API Key Management**
- ✅ **Intelligent Tool Selection**
- ✅ **Conversational Interface**
- ✅ **Full TypeScript Migration**

## Technical Stack

- **Frontend**: Svelte 5 + TypeScript + Tailwind CSS v4
- **Backend**: Chrome Extension Service Worker (TypeScript)
- **Content Scripts**: TypeScript with full type safety
- **LLM Integration**: OpenAI-compatible APIs with TypeScript
- **Build System**: Vite + TypeScript compiler
- **Type Coverage**: 100%

## Development

### Prerequisites

- Node.js 18+
- pnpm (package manager)
- Chrome browser for testing

### Setup

```bash
# Install dependencies
pnpm install

# Development with hot-reload (recommended)
pnpm run dev:hotreload

pnpm run dev:reload

# Type checking
pnpm typecheck
```

### Hot-Reload Development

For the best development experience, use the hot-reload system:

```bash
pnpm run dev:hotreload
```

This will:

- Build the extension initially
- Watch for file changes in all source directories
- Automatically rebuild when changes are detected
- Provide clear instructions for reloading the extension in Chrome

When you see the build success message, simply:

1. Open `chrome://extensions`
2. Click the refresh button on your extension
3. Your changes will be live!

### Manual Development

### Project Structure

```
├── src/sidebar/           # Svelte app (TypeScript)
├── background.ts          # Service worker (TypeScript)
├── content_scripts/       # Content scripts (TypeScript)
├── manifest.json          # Extension manifest
└── dist/                  # Build output
```

# Lumik Agent

Lumik Agent 是一款通用型 AI 浏览器扩展，能通过自然语言命令在任意网页上自动完成多步任务。

---

## 项目亮点

- **自然语言指令**：直接用中文或英文描述你的需求
- **全网页兼容**：支持所有网站，无需适配
- **强大工具系统**：可点击、输入、导航、管理标签页、下载文件等
- **安全架构**：只允许预定义工具操作，绝不执行任意代码
- **智能页面扫描**：自动识别页面可交互元素
- **全 TypeScript**：类型安全，开发体验优异
- **LLM 智能决策**：支持所有 OpenAI 兼容 API，灵活接入本地/云端模型

## 安装与配置

### 1. 安装扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 右上角启用“开发者模式”
3. 点击“加载已解压的扩展”，选择项目文件夹
4. 工具栏会出现 Lumik Agent 图标

### 2. 配置 LLM API

1. 点击侧边栏图标打开扩展
2. 进入“配置”面板
3. 选择 OpenAI 兼容 API，输入 API Key
4. 可选：自定义 API 地址，支持本地模型/第三方服务
5. 选择模型（推荐 GPT-4o Mini）
6. 点击“保存配置”

### 3. 开始使用

配置完成后，直接用自然语言输入你的需求即可！

## 使用方法

1. 打开侧边栏，输入你的指令，例如：
    - “帮我发送一条推文说你好”
    - “下载当前页面的 PDF 文件”
2. AI 会自动分析页面并执行所需操作

## 最新进展

- ✅ 已完成 TypeScript 全面迁移，代码更安全
- ✅ 工具系统完善，支持 20+ 浏览器/DOM 操作
- ✅ 智能页面扫描与状态管理，操作更稳定
- ✅ 支持自定义 API 地址，兼容本地/云端模型
- ✅ UI 现代化，交互体验提升
- ✅ 热重载开发环境，开发效率高

---

## 架构与开发日志

- 采用“工具选择”架构，LLM 只负责决策，所有操作由安全工具执行
- 支持标签页管理、DOM 操作、下载、导航等多种能力
- 智能页面扫描与稳定性检测，确保操作准确
- 所有开发进展与技术细节见 `dev-journal/` 文件夹

---

## 贡献与开发

欢迎参与开发！请阅读 `dev-journal/` 了解项目架构与开发规范。

开发环境支持热重载：

```bash
pnpm run dev:hotreload
```

如遇问题或建议，欢迎提交 Issue。

## Next Steps

- **Phase 3**: Advanced error handling and retry logic
- **Phase 4**: Enhanced context management and performance
- **Phase 5**: Additional tools and capabilities

## Architecture

The extension uses a safe "tool-based" architecture:

1. **Vision**: Scans page for interactable elements
2. **Reasoning**: LLM chooses appropriate tools
3. **Action**: Executes predefined, safe tools
4. **Loop**: Continues until task is complete

No arbitrary code execution - much safer than traditional automation!
