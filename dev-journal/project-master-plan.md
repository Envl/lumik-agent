# Master Project Plan: General-Purpose, API-Driven Browser AI Agent

**Goal:** Develop a Chrome extension that uses an LLM to understand a user's command, analyze the current web page's structure, and then decide which tools to use—including both DOM manipulation and powerful `chrome.*` APIs—to accomplish multi-step tasks on any website.

**Core Architectural Shift:** We will **not** have the LLM generate raw JavaScript. Instead, the LLM will act as a "reasoning engine" that chooses from a predefined set of "tools" we provide. The background script will then execute those tools. This is safer, more reliable, and more powerful.

---

## Phase 1: Foundation & The "Vision" System (3-4 Days)

**Objective:** Set up the extension and create a system for the LLM to "see" and understand the content of any web page.

### 1. Project Initialization & `manifest.json`

- **Expanded Permissions:**
  - `sidePanel`, `scripting`, `activeTab`, `storage`
  - `tabs`: To create, query, update, and close tabs
  - `history`: To search browser history
  - `downloads`: To initiate downloads
- **Crucial `host_permissions`:** Set to `"<all_urls>"` since the agent must be able to run on any website

### 2. Sidebar & Background Communication

- `sidebar.html` / `sidebar.js`: Chat UI interface
- `background.js`: Central "brain" or router

### 3. Enhanced Vision Content Script (`content_scripts/scanner.js`)

```javascript
function getInteractableElements() {
  const elements = []
  const selectors = [
    'button',
    'input',
    'textarea',
    'select',
    'a[href]',
    '[role="button"]',
    '[role="link"]',
    '[role="textbox"]',
    '[contenteditable="true"]',
    '[tabindex="0"]',
  ]

  document.querySelectorAll(selectors.join(',')).forEach((el, index) => {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      // Only visible elements
      const elementId = `llm-${index}`
      el.setAttribute('data-llm-id', elementId)

      elements.push({
        elementId,
        tag: el.tagName.toLowerCase(),
        text: el.innerText?.trim().substring(0, 100) || '',
        attributes: {
          placeholder: el.placeholder,
          'aria-label': el.getAttribute('aria-label'),
          title: el.title,
          href: el.href,
          type: el.type,
        },
        position: { x: rect.left, y: rect.top },
      })
    }
  })

  return elements
}
```

---

## Phase 2: The "Tools" System & LLM Prompting (4-6 Days)

**Objective:** Define a set of capabilities (tools) for the agent and create a master prompt that teaches the LLM how to use them.

### 1. Complete Tool Manifest in `background.js`

```javascript
const AVAILABLE_TOOLS = {
  // DOM Tools
  dom_type: 'Types text into input field. Args: elementId, text',
  dom_click: 'Clicks element. Args: elementId',
  dom_select: 'Selects option from dropdown. Args: elementId, optionText',
  dom_scroll: "Scrolls page. Args: direction ('up'|'down'|'top'|'bottom')",
  dom_wait: 'Waits for element to appear. Args: selector, timeout',

  // Navigation Tools
  navigate_to: 'Navigate to URL. Args: url',
  navigate_back: 'Go back in history',
  navigate_forward: 'Go forward in history',
  navigate_refresh: 'Refresh current page',

  // Tab Management
  tabs_create: 'Open new tab. Args: url',
  tabs_close: 'Close current tab',
  tabs_switch: 'Switch to tab. Args: tabId or url pattern',
  tabs_list: 'List all open tabs with their titles and URLs',

  // Browser APIs
  downloads_start: 'Download file. Args: url, filename',
  storage_set: 'Remember information. Args: key, value',
  storage_get: 'Recall information. Args: key',

  // Meta Tools
  task_complete: 'Mark task as done. Args: message',
  ask_user: 'Ask user for clarification. Args: question',
  take_screenshot: 'Capture current page',
}
```

### 2. Enhanced Master Prompt

```javascript
function buildMasterPrompt(command, pageContent, previousActions = []) {
  return `You are a browser automation AI assistant.

CURRENT PAGE CONTEXT:
${JSON.stringify(pageContent, null, 2)}

USER COMMAND: "${command}"

PREVIOUS ACTIONS TAKEN:
${previousActions
  .map(a => `- ${a.tool_name}: ${JSON.stringify(a.arguments)}`)
  .join('\n')}

AVAILABLE TOOLS:
${Object.entries(AVAILABLE_TOOLS)
  .map(([name, desc]) => `${name}: ${desc}`)
  .join('\n')}

INSTRUCTIONS:
1. Analyze the current page and user command
2. Choose the SINGLE next best action
3. If task is complete, use "task_complete"
4. If you need clarification, use "ask_user"
5. Respond with ONLY valid JSON, no explanations

RESPONSE FORMAT:
{
  "reasoning": "Brief explanation of why this action",
  "tool_name": "tool_to_use",
  "arguments": { "key": "value" }
}`
}
```

### 3. LLM Service with Error Handling

- `callLLM(prompt)` function with robust JSON parsing
- Error handling for malformed LLM responses

---

## Phase 3: The Agent Loop & Execution (3-5 Days)

**Objective:** Create the main loop that connects vision, reasoning (LLM), and action.

### 1. Central Router with State Management

```javascript
class AgentState {
  constructor() {
    this.currentTask = null
    this.actionHistory = []
    this.pageHistory = []
    this.userContext = {}
  }

  addAction(action, result) {
    this.actionHistory.push({ action, result, timestamp: Date.now() })
  }

  getRecentActions(count = 5) {
    return this.actionHistory.slice(-count)
  }
}

async function handleUserCommand(command) {
  // 1. VISION: Get the current page's content
  const activeTab = await getActiveTab()
  const pageContent = await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    files: ['content_scripts/scanner.js'],
  })
  const interactableElements = pageContent[0].result

  // 2. PROMPT: Prepare the prompt for the LLM
  const prompt = buildMasterPrompt(
    command,
    interactableElements,
    agentState.getRecentActions()
  )

  // 3. REASONING: Call the LLM to get the next action
  const llmResponse = await callLLM(prompt)
  const action = JSON.parse(llmResponse)

  // 4. ACTION: Execute the chosen tool
  const result = await executeTool(action)
  agentState.addAction(action, result)
}
```

### 2. Enhanced Tool Executor with Error Handling

```javascript
async function executeTool(action, retryCount = 0) {
  try {
    const { tool_name, arguments: args } = action

    switch (tool_name) {
      case 'dom_click':
        const result = await chrome.scripting.executeScript({
          target: { tabId: await getActiveTabId() },
          func: elementId => {
            const el = document.querySelector(`[data-llm-id='${elementId}']`)
            if (!el) return { success: false, error: 'Element not found' }
            el.click()
            return { success: true }
          },
          args: [args.elementId],
        })

        if (!result[0].result.success && retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          return executeTool(action, retryCount + 1)
        }
        break

      case 'dom_type':
        await chrome.scripting.executeScript({
          target: { tabId: await getActiveTabId() },
          func: (elementId, text) => {
            const el = document.querySelector(`[data-llm-id='${elementId}']`)
            if (el) {
              el.focus()
              el.value = text
              el.dispatchEvent(new Event('input', { bubbles: true }))
            }
          },
          args: [args.elementId, args.text],
        })
        break

      case 'tabs_create':
        await chrome.tabs.create({ url: args.url })
        break

      case 'tabs_list':
        const tabs = await chrome.tabs.query({})
        return tabs.map(tab => ({
          id: tab.id,
          title: tab.title,
          url: tab.url,
          active: tab.active,
        }))

      case 'tabs_close':
        const activeTab = await getActiveTab()
        await chrome.tabs.remove(activeTab.id)
        break

      case 'tabs_switch':
        if (args.tabId) {
          await chrome.tabs.update(args.tabId, { active: true })
        } else if (args.url) {
          const tabs = await chrome.tabs.query({ url: `*${args.url}*` })
          if (tabs.length > 0) {
            await chrome.tabs.update(tabs[0].id, { active: true })
          }
        }
        break

      case 'navigate_to':
        await chrome.tabs.update(await getActiveTabId(), { url: args.url })
        break

      case 'downloads_start':
        await chrome.downloads.download({
          url: args.url,
          filename: args.filename,
        })
        break

      case 'storage_set':
        await chrome.storage.local.set({ [args.key]: args.value })
        break

      case 'storage_get':
        const data = await chrome.storage.local.get([args.key])
        return data[args.key]

      case 'task_complete':
        // Send final message to sidebar
        return { completed: true, message: args.message }

      case 'ask_user':
        // Send question to sidebar and wait for response
        return { question: args.question }

      // ... other cases
    }
  } catch (error) {
    console.error('Tool execution failed:', error)
    return { success: false, error: error.message }
  }
}
```

### 3. The Agent Loop

- Multi-step task handling with automatic re-scanning
- Loop termination when LLM calls `"task_complete"`
- Error recovery and retry mechanisms

---

## Key Features & Benefits

### ✅ **Works on Any Website**

- Vision system adapts to any page structure
- No hardcoded selectors or site-specific logic

### ✅ **Leverages Extension APIs**

- Full access to Chrome extension capabilities
- Tab management, downloads, storage, and more

### ✅ **Significantly More Secure**

- No `eval()` of LLM-generated code
- Pre-defined, sandboxed tool execution
- Input validation and sanitization

### ✅ **More Reliable**

- Discrete, testable actions
- Error handling and retry logic
- Clear debugging and failure points

### ✅ **Extensible Architecture**

- Easy to add new tools
- Modular design for maintenance
- State management for complex workflows
