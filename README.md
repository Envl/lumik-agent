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

# Build the extension
pnpm build

# Development with watch mode
pnpm build:watch

# Manual extension reload helper
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
