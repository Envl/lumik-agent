// Background Script for Lumik Agent
// This is the central "brain" that coordinates between the LLM, tools, and UI

// Import types for Chrome Extension APIs
/// <reference types="chrome" />

interface AgentAction {
    action: {
        tool_name: string
        reasoning: string
        arguments: Record<string, any>
    }
    result: any
    timestamp: number
}

interface LLMResponse {
    success: boolean
    action?: {
        reasoning: string
        tool_name: string
        arguments: Record<string, any>
    }
    error?: string
}

interface ToolResult {
    success: boolean
    error?: string
    completed?: boolean
    message?: string
    question?: string
    response?: string
    [key: string]: any
}

interface SidebarMessage {
    type: string
    content?: string
    message?: string
    action?: string
    error?: string
    question?: string
}

interface PageContext {
    url: string
    title: string
    elements: any[]
    totalElements: number
    pageHeight: number
    pageWidth: number
    scrollPosition: { x: number; y: number }
}

interface ConversationMessage {
    id: string
    sender: 'user' | 'agent'
    content: string
    type: 'text' | 'html'
    timestamp: string
}

let taskPlan = ``

// Agent State Management
class AgentState {
    currentTask: string | null = null
    actionHistory: AgentAction[] = []
    pageHistory: any[] = []
    userContext: Record<string, any> = {}
    isProcessing: boolean = false

    addAction(
        action: any,
        result: {
            result: ToolResult
            success: boolean
            tabs: any[]
        }
    ): void {
        this.actionHistory.push({
            action,
            result,
            timestamp: Date.now()
        })

        // Keep only last 10 actions
        if (this.actionHistory.length > 10) {
            this.actionHistory = this.actionHistory.slice(-10)
        }
    }

    getRecentActions(count: number = 5): AgentAction[] {
        console.log(`📜 DEBUG: Getting last ${count} actions`, this.actionHistory.slice(-count))
        return this.actionHistory.slice(-count)
    }

    setCurrentTask(task: string): void {
        this.currentTask = task
        this.actionHistory = [] // Reset for new task
    }

    clearTask(): void {
        this.currentTask = null
        this.actionHistory = []
        this.isProcessing = false
    }
}

// Available tools for the AI agent with comprehensive definitions
const AVAILABLE_TOOLS: Record<string, string> = {
    // DOM Tools - For interacting with page elements
    hit_enter:
        'Simulates hitting the Enter key on an input field. Use this after typing text to submit forms or search queries. Args: {elementId: string} - The elementId from page scan results (e.g., "llm-5")',
    dom_click:
        'Clicks on a specific element on the page. Use this after scanning page to get element IDs. Args: {elementId: string} - The elementId from page scan results (e.g., "llm-5")',
    dom_type:
        'Types text into an input field, textarea, or editable element. Clears existing content first. Args: {elementId: string, text: string, hitEnter?:boolean} - elementId from page scan, text to type, if true hit Enter after typing. always hitEnter for search requests',
    dom_select:
        'Selects an option from a dropdown/select element by matching option text. Args: {elementId: string, optionText: string} - elementId from page scan, partial text of option to select',
    dom_scroll:
        'Scrolls the current page in specified direction. Args: {direction: "up"|"down|"top"|"bottom"} - "top"/"bottom" go to extremes, "up"/"down" scroll by viewport height',
    dom_clear:
        'Clears text content from an input field or textarea. Args: {elementId: string} - elementId from page scan results',

    // Navigation Tools - For changing page/URL
    navigate_to:
        'Navigate current tab to a specific URL. Use full URLs (https://...). Args: {url: string} - Complete URL to navigate to',
    navigate_back: 'Go back one page in browser history. No arguments required. Args: {}',
    navigate_forward: 'Go forward one page in browser history. No arguments required. Args: {}',
    navigate_refresh: 'Refresh/reload the current page. No arguments required. Args: {}',

    // Tab Management - For working with browser tabs
    tabs_create:
        'Open new browser tabs with specified URLs. Args: {urls: string[]} - URLs to open in new tab',
    tabs_close_active: 'Close the currently active tab. No arguments required. Args: {}',
    tabs_close: 'Close a specific tab by ID. Args: {tabIds: number[]} - ID of the tab to close',
    tabs_switch:
        'Switch to a different tab by ID or URL pattern. Args: {tabId?: number, url?: string} - Use tabId from tabs_list OR url pattern to match (e.g., "youtube")',
    tabs_list:
        'Get list of all open tabs with their IDs, titles, and URLs. Returns array of tab objects. No arguments required. Args: {}',

    // Browser APIs - For downloads and storage
    downloads_start:
        'Download a file from URL to default downloads folder. Args: {url: string, filename?: string} - URL to download, optional custom filename',
    storage_set:
        'Store information in browser storage for later retrieval. Args: {key: string, value: any} - key name and value to store',
    storage_get:
        'Retrieve previously stored information from browser storage. Args: {key: string} - key name to retrieve',

    // Page Analysis - For understanding page content
    page_scan:
        'Scan current page for interactable elements (buttons, links, inputs, etc.). Returns array of elements with IDs, types, and text. Use this before DOM operations. No arguments required. Args: {}',
    page_info:
        'Get basic information about current page (title, URL, tab ID). No arguments required. Args: {}',
    element_highlight:
        'Visually highlight an element on the page for 3 seconds (for debugging). Args: {elementId: string} - elementId from page scan results',

    // Meta Tools - For task management and user interaction
    task_complete:
        "Mark the current task as successfully completed. Use when user's goal is achieved. Args: {message: string} - Success message describing what was accomplished",
    ask_user:
        'Ask user for clarification or additional information when task is unclear. Args: {question: string} - Specific question to ask the user',
    respond:
        'Provide a response or status update to the user without completing the task. Args: {message: string} - Message to send to user'
}

// Global state
const agentState = new AgentState()

// LLM Bridge Service for Background Script
class LLMBridge {
    private isConfigured: boolean = false
    private currentConfig: any = null

    constructor() {
        this.loadConfiguration()
    }

    async loadConfiguration(): Promise<void> {
        try {
            const result = await chrome.storage.local.get(['llmConfig'])
            this.currentConfig = result.llmConfig || null
            this.isConfigured = this.currentConfig !== null && this.currentConfig.apiKey.length > 0
        } catch (error) {
            console.error('Error loading LLM config:', error)
            this.isConfigured = false
        }
    }

    isConfiguredProperly(): boolean {
        return this.isConfigured
    }

    async makeRequest(messages: any[]): Promise<any> {
        if (!this.isConfigured) {
            throw new Error('LLM not configured. Please configure API key in settings.')
        }

        return this.makeOpenAICompatibleRequest(messages)
    }

    private async makeOpenAICompatibleRequest(messages: any[]): Promise<any> {
        const apiUrl = this.currentConfig.apiUrl || 'https://api.openai.com/v1'
        const response = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.currentConfig.apiKey}`
            },
            body: JSON.stringify({
                model: this.currentConfig.model,
                messages: messages,
                temperature: this.currentConfig.temperature,
                max_tokens: this.currentConfig.maxTokens
            })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`API error: ${error.error?.message || response.statusText}`)
        }

        const data = await response.json()
        return {
            content: data.choices[0].message.content,
            usage: data.usage
        }
    }

    async decideAction(
        userCommand: string,
        pageContext: any,
        conversationHistory: any[],
        recentActions: AgentAction[],
        availableTools: Record<string, string>
    ): Promise<any> {
        const systemPrompt = await this.buildSystemPrompt(availableTools)
        const userPrompt = this.buildUserPrompt(
            userCommand,
            pageContext,
            conversationHistory,
            recentActions
        )

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]

        // DEBUG: Log full prompt for debugging
        console.log('🔍 DEBUG: Full LLM Prompt')
        console.log('==== SYSTEM PROMPT ====')
        console.log(systemPrompt)
        console.log('==== USER PROMPT ====')
        console.log(userPrompt)
        console.log('==== END PROMPT ====')

        const response = await this.makeRequest(messages)

        // DEBUG: Log raw LLM response
        console.log('🤖 DEBUG: Raw LLM Response')
        console.log(response.content)
        console.log('==== END RESPONSE ====')

        return this.parseAgentDecision(response.content)
    }

    private async buildSystemPrompt(availableTools: Record<string, string>) {
        const toolsList = Object.entries(availableTools)
            .map(([name, description]) => `- ${name}: ${description}`)
            .join('\n')

        const promptOpeningTabs = `Other Opening Tabs:
${await tabsList().then((d) =>
    d?.tabs
        .map(
            (t: { id: number; title: string; url: string }) => `- ID:${t.id} [${t.title}](${t.url})`
        )
        .join('  \h')
)}`

        // Include task plan in system prompt if available
        const taskPlanSection = taskPlan
            ? `${promptOpeningTabs}

## Current Task Plan
${taskPlan}

The above plan provides context for the current task execution. Use it to guide your decision-making process.`
            : ''

        return `You are Lumik Agent, an AI assistant that helps users perform tasks on websites or just chat with the user. Your job is to:

1. Understand the user's command
2. Analyze the current page context
3. Decide on the next action to take (do not take action on webpage unless the user explicitly asks for it)

You have access to these tools:
${toolsList}${taskPlanSection}

IMPORTANT RULES:
- Always think step by step and be methodical
- If you realize the user is just talking to you, then just respond with a message
- Only use one tool at a time per response
- For tab navigation tasks: Use tabs_list first to see available tabs, then tabs_switch with appropriate arguments
- For web page interactions: Use page_scan first to get element IDs, then use DOM tools with those IDs
- When switching tabs, you can use either tabId (number) or url (string pattern) - choose the most reliable option
- On special pages (chrome://, extensions, etc.), DOM tools won't work but navigation and tab management tools will
- Complete the task with task_complete when the user's goal is achieved
- Ask for clarification with ask_user if the task is unclear

CRITICAL TAB ID RULES:
- Tab IDs are NOT sequential numbers (1, 2, 3, etc.) - they are actual Chrome tab IDs
- ALWAYS use tabs_list first to get the real tab IDs before using tabs_close or tabs_switch
- Tab IDs from tabs_list results are formatted as "ID:123 'Title' (URL)" - extract the number after "ID:"
- Never guess tab IDs - always use the exact IDs returned by tabs_list


TOOL USAGE PATTERNS:
- Tab switching: tabs_list → tabs_switch (with tabId or url pattern)
- Page interaction: page_scan → dom_click/dom_type/etc (with elementId)
- Navigation: navigate_to (with full URL)
- Task completion: task_complete (with success message) (do not include useful info in plain text response along with task_complete, user can only see messages sent with 'respond', so just use this tool to complete the task)

Response format: You must respond with a JSON object containing:
{
  "action": "use_tool" | "respond" | "ask_question" | "task_complete",
  "tool_call": { "name": "tool_name", "args": {...}, "reasoning": "why this tool" },
  "response": "message to user",
  "question": "question for user",
  "completion_message": "task completed message"
}

Examples:
- To list tabs: {"action": "use_tool", "tool_call": {"name": "tabs_list", "args": {}, "reasoning": "need to see available tabs"}}
- To switch tab by ID: {"action": "use_tool", "tool_call": {"name": "tabs_switch", "args": {"tabId": 123}, "reasoning": "switching to specific tab"}}
- To switch tab by URL: {"action": "use_tool", "tool_call": {"name": "tabs_switch", "args": {"url": "youtube"}, "reasoning": "switching to tab containing youtube"}}
- To click element: {"action": "use_tool", "tool_call": {"name": "dom_click", "args": {"elementId": "llm-5"}, "reasoning": "clicking the login button"}}
- To ask for clarification: {"action": "ask_question", "question": "Which search term would you like me to use?"}
- To complete task: {"action": "task_complete", "completion_message": "Successfully navigated to the youtube tab"}`
    }

    private buildUserPrompt(
        userCommand: string,
        pageContext: any,
        conversationHistory: any[],
        recentActions: AgentAction[]
    ): string {
        const historyText = conversationHistory
            .slice(-5) // Last 5 messages
            .map((msg) => `${msg.sender}: ${msg.content}`)
            .join('\n')

        const actionsText = recentActions
            .map((actionItem) => {
                const result = actionItem.result
                let resultText = ''

                if (result?.success) {
                    if (result.tabs) {
                        // Format tabs_list results
                        resultText = `Found ${result.tabs.length} tabs: ${result.tabs.map((t: any) => `ID:${t.id} "${t.title}" (${t.url})`).join(', ')}`
                    } else if (result.pageInfo) {
                        // Format page_info results
                        resultText = `Page info: "${result.pageInfo.title}" at ${result.pageInfo.url}`
                    } else if (result.value !== undefined) {
                        // Format storage_get results
                        resultText = `Retrieved: ${JSON.stringify(result.value)}`
                    } else if (result.tabId && result.tabTitle) {
                        // Format tabs_switch results
                        resultText = `Switched to tab: "${result.tabTitle}" (ID: ${result.tabId})`
                    } else if (result.tabId) {
                        // Format tabs_create results
                        resultText = `Created new tab with ID: ${result.tabId}`
                    } else {
                        resultText = result.message || 'Success'
                    }
                } else {
                    resultText = `Error: ${result.error}`
                }

                return `${actionItem.action.tool_name}: ${actionItem.action.reasoning} → ${resultText}`
            })
            .join('\n')

        // DEBUG: Log the actions being included in context
        console.log('📋 DEBUG: Recent actions being sent to LLM:')
        if (recentActions.length === 0) {
            console.log('  (No recent actions)')
        } else {
            recentActions.forEach((action, index) => {
                console.log(
                    `  ${index + 1}. ${action.action.tool_name}: ${action.action.reasoning}`
                )
                console.log(
                    `     Result: ${action.result.success ? 'Success' : 'Error: ' + action.result.error}`
                )
            })
        }

        const hasPageContent = pageContext.elements && pageContext.elements.length > 0
        const pageContextText = hasPageContent
            ? `Current Page Context:
- URL: ${pageContext.url || 'Unknown'}
- Title: ${pageContext.title || 'Unknown'}
- Available Elements (${pageContext.elements.length} total): ${JSON.stringify(pageContext.elements || [], null, 2)}`
            : `Current Page Context:
- URL: ${pageContext.url || 'Unknown'}
- Title: ${pageContext.title || 'Unknown'}
- Note: This appears to be a special page (chrome://, extension, etc.) - DOM tools won't work but navigation, tab management, and storage tools are available`

        return `User Command: "${userCommand}"

${pageContextText}

Recent Conversation:
${historyText}

Recent Actions:
${actionsText || 'None yet'}

What should I do next?`
    }

    private parseAgentDecision(content: string): any {
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('No JSON found in response')
            }

            const decision = JSON.parse(jsonMatch[0])

            // Validate required fields
            if (!decision.action) {
                throw new Error('Missing action field')
            }

            return decision
        } catch (error) {
            console.error('Error parsing agent decision:', error)
            // Fallback to a simple response
            return {
                action: 'respond',
                response: content
            }
        }
    }
}

// Initialize the LLM bridge
const llmBridge = new LLMBridge()

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('Lumik Agent installed')
})

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
    try {
        if (tab.id) {
            await chrome.sidePanel.open({ tabId: tab.id })
        }
    } catch (error) {
        console.error('Error opening side panel:', error)
    }
})

// Main message handler
chrome.runtime.onMessage.addListener(
    (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
        handleMessage(request, sender, sendResponse)
        return true // Keep message channel open for async responses
    }
)

async function handleMessage(
    request: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
): Promise<void> {
    try {
        switch (request.action) {
            case 'executeCommand':
                await handleUserCommand(request.command)
                sendResponse({ success: true })
                break

            case 'scanPage':
                const scanResult = await scanCurrentPage()
                sendResponse(scanResult)
                break

            case 'getAgentState':
                sendResponse({
                    currentTask: agentState.currentTask,
                    isProcessing: agentState.isProcessing,
                    actionHistory: agentState.getRecentActions()
                })
                break

            default:
                sendResponse({ success: false, error: 'Unknown action' })
        }
    } catch (error) {
        console.error('Error handling message:', error)
        sendResponse({ success: false, error: (error as Error).message })
    }
}

async function handleUserCommand(command: string): Promise<void> {
    if (agentState.isProcessing) {
        await sendToSidebar({
            type: 'agentResponse',
            content: "I'm currently processing another task. Please wait."
        })
        return
    }

    agentState.setCurrentTask(command)
    agentState.isProcessing = true

    try {
        await sendToSidebar({
            type: 'agentThinking',
            message: 'Analyzing your request...'
        })

        // Start the agent loop
        await agentLoop(command)
    } catch (error) {
        console.error('Error in agent loop:', error)
        await sendToSidebar({ type: 'agentError', error: (error as Error).message })
    } finally {
        agentState.clearTask()
        // Clear task plan when loop finishes or aborts
        taskPlan = ''
        console.log(`🧹 DEBUG: Task plan cleared in finally block`)
    }
}

// TODO, let quick model to set maxSteps according to task complexity

async function buildTaskPlan(command: string, pageContext: PageContext): Promise<string> {
    try {
        // Check if LLM is configured before using it
        await llmBridge.loadConfiguration()
        if (!llmBridge.isConfiguredProperly()) {
            // Fallback to simple plan if LLM not configured
            return `# Task Plan

## Primary Objective
Execute user command: "${command}"

## Success Criteria
- Task completion as determined by basic execution logic
- No system errors during execution

## Execution Strategy
1. **Basic Assessment**
   - Action: Use available context
   - Expected Outcome: Understanding of current state
   - Validation: Context is accessible

2. **Sequential Execution**
   - Action: Execute actions in logical order
   - Expected Outcome: Progress toward goal
   - Validation: Each action completes successfully

3. **Task Completion**
   - Action: Complete when objective appears met
   - Expected Outcome: User's goal achieved
   - Validation: Basic success indicators present

## Risk Assessment
- Limited planning due to LLM not being configured
- May require more user interaction
- Alternative: Manual step-by-step guidance

## Validation Plan
- Monitor basic success/failure indicators
- Request user confirmation for complex decisions
- Complete task when basic criteria met

## Status
LLM not configured - using basic execution strategy.`
        }

        const planningPrompt = `You are a task planning assistant. Create a detailed, actionable execution plan for the following user command.

User Command: "${command}"

Current Page Context:
- URL: ${pageContext.url}
- Title: ${pageContext.title}
- Page Elements: ${pageContext.elements?.length || 0} interactive elements found
- Page Type: ${pageContext.url?.includes('chrome://') || pageContext.url?.includes('extension://') ? 'Special page (chrome://, extension, etc.)' : 'Regular webpage'}

Available Tools: hit_enter, dom_click, dom_type, dom_select, dom_scroll, dom_clear, navigate_to, navigate_back, navigate_forward, navigate_refresh, tabs_create, tabs_close, tabs_switch, tabs_list, downloads_start, storage_set, storage_get, page_scan, page_info, element_highlight, task_complete, ask_user, respond

Create a structured task plan with the following sections:

## Primary Objective
- State the main goal in one clear sentence
- Define what success looks like

## Success Criteria
- List specific, measurable outcomes that indicate task completion
- Include both positive indicators (what should happen) and negative indicators (what should not happen)
- Define clear checkpoints for validation

## Execution Strategy
- Break down the task into 3-7 actionable steps
- For each step, specify:
  - The action to take
  - The expected outcome
  - The tool(s) to use
  - How to verify success
- Order steps logically with dependencies

## Risk Assessment
- Identify potential failure points
- List alternative approaches if primary strategy fails
- Note any ambiguities that may require user clarification

## Validation Plan
- How to confirm each step was successful
- What to do if validation fails
- When to ask for user input or clarification

Format as markdown with clear headings, bullet points, and numbered steps. Be specific and actionable.`

        const messages = [{ role: 'user', content: planningPrompt }]

        const response = await llmBridge.makeRequest(messages)
        return response.content
    } catch (error) {
        console.error('Error building task plan with LLM:', error)
        // Fallback to simple plan if LLM fails
        return `# Task Plan

## Primary Objective
Execute user command: "${command}"

## Success Criteria
- Task completion as determined by context and user feedback
- No system errors during execution

## Execution Strategy
1. **Initial Assessment**
   - Action: Analyze current page context
   - Tool: page_scan
   - Expected Outcome: Understanding of available page elements
   - Validation: Elements are identified and accessible

2. **Command Execution**
   - Action: Execute appropriate actions based on command
   - Tool: Context-dependent (DOM tools, navigation, etc.)
   - Expected Outcome: Progress toward user's goal
   - Validation: Actions complete successfully

3. **Task Completion**
   - Action: Verify goal achievement
   - Tool: task_complete
   - Expected Outcome: User's objective is met
   - Validation: User confirms satisfaction

## Risk Assessment
- Limited context due to plan generation failure
- May require user clarification for complex tasks
- Alternative: Progressive execution with user feedback

## Validation Plan
- Monitor each action for success/failure
- Ask user for clarification when needed
- Confirm task completion before finishing

## Note
Task plan generation failed, using fallback strategy.`
    }
}

async function agentLoop(command: string, maxSteps = 20): Promise<void> {
    let currentStep = 0

    console.log(`🚀 DEBUG: Starting agent loop for command: "${command}"`)

    try {
        // 1. INITIAL SETUP: Get current page content for planning
        await sendToSidebar({
            type: 'agentAction',
            action: 'Analyzing request and building plan...'
        })
        let pageContent = { success: false, data: {}, error: 'Unsupported page type' }

        const activeTab = await getActiveTab()
        if (activeTab?.url && isRegularWebpage(activeTab.url)) {
            pageContent = await scanCurrentPage()
        }

        // Create initial PageContext for planning
        const initialPageContext: PageContext = pageContent.success
            ? (pageContent.data as PageContext)
            : {
                  url: activeTab?.url || 'Unknown',
                  title: activeTab?.title || 'Unknown',
                  elements: [],
                  totalElements: 0,
                  pageHeight: 0,
                  pageWidth: 0,
                  scrollPosition: { x: 0, y: 0 }
              }

        // Build task plan
        taskPlan = await buildTaskPlan(command, initialPageContext)
        console.log(`📋 DEBUG: Task plan created:`)
        console.log(taskPlan)

        await sendToSidebar({ type: 'agentAction', action: 'Plan created, executing task...' })
    } catch (error) {
        console.error('Error in initial setup:', error)
        taskPlan = '' // Clear plan on error
        throw error
    }

    while (currentStep < maxSteps && agentState.isProcessing) {
        currentStep++
        console.log(`\n📍 DEBUG: Agent Loop Step ${currentStep}/${maxSteps}`)

        // 1. VISION: Get current page content - only scan if it's a normal webpage
        await sendToSidebar({ type: 'agentAction', action: 'Scanning page...' })
        let pageContent = { success: false, data: {}, error: 'Unsupported page type' }

        const activeTab = await getActiveTab()
        if (activeTab?.url && isRegularWebpage(activeTab.url)) {
            pageContent = await scanCurrentPage()
        }

        if (!pageContent.success) {
            // Check if it's a special page type that can't be scanned
            if (
                pageContent.error?.includes('Cannot scan this page type') ||
                pageContent.error?.includes('Unsupported page type')
            ) {
                // Continue without page content - agent can still do tab management, navigation, etc.
                console.log('Special page detected, continuing without page content')
            } else {
                // For other errors, still throw
                throw new Error('Failed to scan page: ' + pageContent.error)
            }
        }

        // Create a proper PageContext object
        const pageContextData: PageContext = pageContent.success
            ? (pageContent.data as PageContext)
            : {
                  url: activeTab?.url || 'Unknown',
                  title: activeTab?.title || 'Unknown',
                  elements: [],
                  totalElements: 0,
                  pageHeight: 0,
                  pageWidth: 0,
                  scrollPosition: { x: 0, y: 0 }
              }

        // Get conversation history for context
        const conversationHistory = await getConversationHistory()

        console.log(`📝 DEBUG: Context for step ${currentStep}:`)
        console.log('- Page URL:', pageContextData.url)
        console.log('- Page Title:', pageContextData.title)
        console.log('- Elements found:', pageContextData.elements?.length || 0)
        console.log('- Recent actions:', agentState.getRecentActions().length)
        console.log('- Conversation history:', conversationHistory.length, 'messages')

        // 2. REASONING: Call LLM with context
        await sendToSidebar({
            type: 'agentAction',
            action: 'Reasoning about next action...'
        })
        const llmResponse = await callLLM(
            command,
            pageContextData,
            conversationHistory,
            agentState.getRecentActions()
        )

        if (!llmResponse.success) {
            throw new Error('LLM error: ' + llmResponse.error)
        }

        const action = llmResponse.action
        if (!action) {
            throw new Error('No action received from LLM')
        }

        console.log('LLM chose action:', action)

        // 4. ACTION: Execute the chosen tool
        await sendToSidebar({
            type: 'agentAction',
            action: `Executing: ${action.tool_name}`
        })

        console.log(`🔧 DEBUG: Executing tool: ${action.tool_name}`)
        console.log('Tool arguments:', action.arguments)

        const result = await executeTool(action)

        console.log(`✅ DEBUG: Tool result for ${action.tool_name}:`)
        console.log(JSON.stringify(result, null, 2))

        // Log the action
        agentState.addAction(action, result)

        // Wait for any pending state changes before next iteration
        if (
            action.tool_name === 'tabs_switch' ||
            action.tool_name === 'navigate_to' ||
            action.tool_name === 'navigate_back' ||
            action.tool_name === 'navigate_forward' ||
            action.tool_name === 'navigate_refresh'
        ) {
            console.log('🔄 DEBUG: Waiting for navigation/tab switch to complete...')
            await waitForPageStabilization()
        } else if (
            action.tool_name === 'dom_click' ||
            action.tool_name === 'dom_type' ||
            action.tool_name === 'dom_select' ||
            action.tool_name === 'dom_clear'
        ) {
            console.log('🔄 DEBUG: Waiting for DOM interaction to complete...')
            await waitForDOMStabilization()
        }

        // Check if task is complete
        if (action.tool_name === 'task_complete') {
            console.log('✅ DEBUG: Task completed successfully')
            await sendToSidebar({
                type: 'taskComplete',
                message: action.arguments?.message || 'Task completed!'
            })
            break
        }

        // Check if user input is needed
        if (action.tool_name === 'ask_user') {
            console.log('❓ DEBUG: User input required')
            await sendToSidebar({
                type: 'agentQuestion',
                question: action.arguments?.question || 'I need more information.'
            })
            break
        }

        // Check if it's just a response
        if (action.tool_name === 'respond') {
            console.log('💬 DEBUG: Agent providing response')
            await sendToSidebar({
                type: 'agentResponse',
                content: action.arguments?.message || action.reasoning || 'I see.'
            })
            break
        }

        // Brief pause between actions
        await new Promise((resolve) => setTimeout(resolve, 1000))

        console.log(`⏸️ DEBUG: Step ${currentStep} complete, continuing to next iteration...`)
    }

    if (currentStep >= maxSteps) {
        console.log(`🚫 DEBUG: Agent loop exceeded ${maxSteps} steps`)
        await sendToSidebar({
            type: 'agentError',
            error: 'Task took too many steps. Please try breaking it down.'
        })
    }

    console.log(`🏁 DEBUG: Agent loop finished after ${currentStep} steps`)

    // Clear task plan when loop finishes
    taskPlan = ''
    console.log(`🧹 DEBUG: Task plan cleared`)
}

async function scanCurrentPage(): Promise<any> {
    try {
        const activeTab = await getActiveTab()
        if (!activeTab?.id) {
            throw new Error('No active tab found')
        }

        // Check if tab is a valid web page (not chrome:// or other special URLs)
        if (!isRegularWebpage(activeTab.url)) {
            return {
                success: false,
                error: 'Cannot scan this page type. Please navigate to a regular webpage.'
            }
        }

        try {
            // Try to send message to content script
            const response = await chrome.tabs.sendMessage(activeTab.id, {
                action: 'scanPage'
            })
            return response
        } catch (messageError) {
            // If content script is not ready, try to inject it
            console.log('Content script not ready, attempting to inject...')

            try {
                // Inject the content script
                await chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['scanner.js']
                })

                // Wait a bit for script to initialize
                await new Promise((resolve) => setTimeout(resolve, 100))

                // Try again
                const response = await chrome.tabs.sendMessage(activeTab.id, {
                    action: 'scanPage'
                })
                return response
            } catch (injectionError) {
                console.error('Failed to inject content script:', injectionError)
                return {
                    success: false,
                    error: 'Failed to initialize page scanner. Please refresh the page and try again.'
                }
            }
        }
    } catch (error) {
        console.error('Error scanning page:', error)
        return { success: false, error: (error as Error).message }
    }
}

async function callLLM(
    userCommand: string,
    pageContext: PageContext,
    conversationHistory: ConversationMessage[],
    recentActions: AgentAction[]
): Promise<LLMResponse> {
    try {
        // Check if LLM is configured
        await llmBridge.loadConfiguration()

        // Check configuration using public method
        if (!llmBridge.isConfiguredProperly()) {
            return {
                success: false,
                error: 'LLM not configured. Please configure API key in settings.'
            }
        }

        // Use LLM bridge to decide next action with provided context
        const decision = await llmBridge.decideAction(
            userCommand,
            pageContext,
            conversationHistory,
            recentActions,
            AVAILABLE_TOOLS
        )

        console.log('LLM Decision:', decision)

        // Convert decision to legacy format for compatibility
        if (decision.action === 'use_tool') {
            return {
                success: true,
                action: {
                    reasoning: decision.tool_call.reasoning,
                    tool_name: decision.tool_call.name,
                    arguments: decision.tool_call.args
                }
            }
        } else if (decision.action === 'task_complete') {
            return {
                success: true,
                action: {
                    reasoning: decision.completion_message,
                    tool_name: 'task_complete',
                    arguments: {
                        message: decision.completion_message
                    }
                }
            }
        } else if (decision.action === 'ask_user') {
            return {
                success: true,
                action: {
                    reasoning: 'Need user input',
                    tool_name: 'ask_user',
                    arguments: {
                        question: decision.question
                    }
                }
            }
        } else {
            return {
                success: true,
                action: {
                    reasoning: 'Providing response',
                    tool_name: 'respond',
                    arguments: {
                        message: decision.response
                    }
                }
            }
        }
    } catch (error) {
        console.error('LLM error:', error)
        return {
            success: false,
            error: (error as Error).message
        }
    }
}

async function getConversationHistory(): Promise<ConversationMessage[]> {
    try {
        const result = await chrome.storage.local.get(['conversationHistory'])
        return result.conversationHistory || []
    } catch (error) {
        console.error('Error getting conversation history:', error)
        return []
    }
}

async function executeTool(action: {
    tool_name: string
    arguments: Record<string, any>
}): Promise<ToolResult> {
    const { tool_name, arguments: args } = action

    try {
        switch (tool_name) {
            case 'hit_enter':
                return await hitEnter(args.elementId)

            case 'dom_click':
                return await domClick(args.elementId)

            case 'dom_type':
                return await domType(args.elementId, args.text, args.hitEnter ?? false)

            case 'dom_select':
                return await domSelect(args.elementId, args.optionText)

            case 'dom_scroll':
                return await domScroll(args.direction)

            case 'dom_clear':
                return await domClear(args.elementId)

            case 'navigate_to':
                return await navigateTo(args.url)

            case 'navigate_back':
                return await navigateBack()

            case 'navigate_forward':
                return await navigateForward()

            case 'navigate_refresh':
                return await navigateRefresh()

            case 'tabs_create':
                return await tabsCreate(args.urls)

            case 'tabs_close_active':
                return await tabsClose()

            case 'tabs_close':
                return await tabsClose(args.tabIds)

            case 'tabs_switch':
                return await tabsSwitch(args.tabId, args.url)

            case 'tabs_list':
                return await tabsList()

            case 'downloads_start':
                return await downloadsStart(args.url, args.filename)

            case 'storage_set':
                return await storageSet(args.key, args.value)

            case 'storage_get':
                return await storageGet(args.key)

            case 'page_scan':
                return await scanCurrentPage()

            case 'page_info':
                return await getPageInfo()

            case 'element_highlight':
                return await highlightElement(args.elementId)

            case 'task_complete':
                return { success: true, completed: true, message: args.message }

            case 'ask_user':
                return { success: true, question: args.question }

            case 'respond':
                return { success: true, response: args.message }

            default:
                return { success: false, error: `Unknown tool: ${tool_name}` }
        }
    } catch (error) {
        console.error(`Error executing tool ${tool_name}:`, error)
        return { success: false, error: (error as Error).message }
    }
}

// DOM Tool Implementations
async function initializeNetworkTracking(tabId: number): Promise<void> {
    try {
        console.log('🔗 DEBUG: Initializing network tracking for tab', tabId)
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                // Initialize network activity tracking if not already done
                if (!(window as any).__pendingRequests) {
                    console.log('🔗 DEBUG: Setting up network tracking in page')
                    ;(window as any).__pendingRequests = 0

                    // Track fetch requests
                    const originalFetch = window.fetch
                    window.fetch = function (...args) {
                        ;(window as any).__pendingRequests++
                        console.log(
                            '🌐 DEBUG: Fetch started, pending requests:',
                            (window as any).__pendingRequests
                        )
                        return originalFetch.apply(this, args).finally(() => {
                            ;(window as any).__pendingRequests--
                            console.log(
                                '🌐 DEBUG: Fetch completed, pending requests:',
                                (window as any).__pendingRequests
                            )
                        })
                    }

                    // Track XMLHttpRequest
                    const originalXHROpen = XMLHttpRequest.prototype.open
                    XMLHttpRequest.prototype.open = function (
                        method: string,
                        url: string | URL,
                        async: boolean = true,
                        username?: string | null,
                        password?: string | null
                    ) {
                        ;(window as any).__pendingRequests++
                        console.log(
                            '🌐 DEBUG: XHR started, pending requests:',
                            (window as any).__pendingRequests
                        )
                        this.addEventListener('loadend', () => {
                            ;(window as any).__pendingRequests--
                            console.log(
                                '🌐 DEBUG: XHR completed, pending requests:',
                                (window as any).__pendingRequests
                            )
                        })
                        return originalXHROpen.call(this, method, url, async, username, password)
                    }
                } else {
                    console.log(
                        '🔗 DEBUG: Network tracking already initialized, current pending requests:',
                        (window as any).__pendingRequests
                    )
                }
            }
        })
        console.log('✅ DEBUG: Network tracking initialization completed for tab', tabId)
    } catch (error) {
        console.error('❌ DEBUG: Error initializing network tracking:', error)
    }
}

async function hitEnter(elementId: string): Promise<ToolResult> {
    const activeTab = await getActiveTab()
    if (!activeTab?.id) {
        return { success: false, error: 'No active tab found' }
    }

    try {
        // Initialize network tracking
        await initializeNetworkTracking(activeTab.id)

        const result = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (elementId: string) => {
                const element = document.querySelector(
                    `[data-llm-id="${elementId}"]`
                ) as HTMLElement
                if (!element) return { success: false, error: 'Element not found' }

                // Dispatch Enter key event
                const events = [
                    new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    }),
                    new KeyboardEvent('keypress', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    }),
                    new KeyboardEvent('keyup', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    })
                ]

                events.forEach((event) => element.dispatchEvent(event))

                return { success: true }
            },
            args: [elementId]
        })

        return result[0].result as ToolResult
    } catch (error) {
        console.error('Error hitting Enter:', error)
        return { success: false, error: (error as Error).message }
    }
}

async function domClick(elementId: string): Promise<ToolResult> {
    const activeTab = await getActiveTab()
    if (!activeTab?.id) {
        return { success: false, error: 'No active tab found' }
    }

    try {
        // Initialize network tracking
        await initializeNetworkTracking(activeTab.id)

        const result = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (elementId: string) => {
                const element = document.querySelector(
                    `[data-llm-id="${elementId}"]`
                ) as HTMLElement
                if (!element) return { success: false, error: 'Element not found' }

                element.click()
                return { success: true }
            },
            args: [elementId]
        })

        return result[0].result as ToolResult
    } catch (error) {
        console.error('Error clicking element:', error)
        return { success: false, error: (error as Error).message }
    }
}

async function domType(elementId: string, text: string, hitEnter: boolean): Promise<ToolResult> {
    const activeTab = await getActiveTab()
    if (!activeTab?.id) {
        return { success: false, error: 'No active tab found' }
    }

    try {
        // Initialize network tracking
        await initializeNetworkTracking(activeTab.id)

        const result = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (elementId: string, text: string, hitEnter?: boolean) => {
                const el = document.querySelector(`[data-llm-id="${elementId}"]`) as HTMLElement

                if (!el)
                    return {
                        success: false,
                        error: 'Element not found'
                    }

                const dom = {
                    focusEditor(editor: HTMLElement) {
                        // Focus the element
                        editor.focus()

                        // Simulate typing to activate the editor
                        const inputEvent = new InputEvent('input', {
                            bubbles: true,
                            cancelable: true,
                            inputType: 'insertText',
                            data: ''
                        })

                        // Dispatch multiple events that might wake up the editor
                        editor.dispatchEvent(new Event('focus', { bubbles: true }))
                        editor.dispatchEvent(new Event('focusin', { bubbles: true }))
                        editor.dispatchEvent(inputEvent)

                        // Try to position cursor by simulating a click at coordinates
                        const rect = editor.getBoundingClientRect()
                        const clickEvent = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            clientX: rect.left + 10,
                            clientY: rect.top + 10
                        })
                        editor.dispatchEvent(clickEvent)
                    },

                    inputTextByValue(
                        element: HTMLInputElement | HTMLTextAreaElement,
                        text: string
                    ) {
                        this.focusEditor(element)
                        element.value = text
                        element.dispatchEvent(
                            new Event('input', {
                                bubbles: true,
                                cancelable: true
                            })
                        )
                        element.dispatchEvent(
                            new Event('change', {
                                bubbles: true,
                                cancelable: true
                            })
                        )
                    },

                    inputTextIntoContentEditable(element: HTMLElement, text: string) {
                        this.focusEditor(element)

                        setTimeout(() => {
                            // Use the clipboard API to paste text
                            element.focus()
                            document.execCommand('insertText', false, text)

                            element.dispatchEvent(
                                new Event('input', {
                                    bubbles: true,
                                    cancelable: true
                                })
                            )
                        })
                    },

                    async inputText(editor: HTMLElement, text: string) {
                        console.log('inputText called:', text, editor)

                        if (editor.tagName === 'INPUT' || editor.tagName === 'TEXTAREA') {
                            this.inputTextByValue(
                                editor as HTMLInputElement | HTMLTextAreaElement,
                                text
                            )
                        } else if (editor.isContentEditable) {
                            this.inputTextIntoContentEditable(editor, text)
                        }
                    }
                }

                dom.inputText(el, text)

                if (hitEnter) {
                    // Dispatch both keydown and keyup for Enter
                    const events = [
                        new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        }),
                        new KeyboardEvent('keypress', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        }),
                        new KeyboardEvent('keyup', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        })
                    ]

                    events.forEach((event) => el.dispatchEvent(event))
                }

                return { success: true }
            },
            args: [elementId, text, hitEnter]
        })

        return result[0].result as ToolResult
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function domSelect(elementId: string, optionText: string): Promise<ToolResult> {
    const activeTab = await getActiveTab()
    if (!activeTab?.id) {
        return { success: false, error: 'No active tab found' }
    }

    try {
        // Initialize network tracking
        await initializeNetworkTracking(activeTab.id)

        const result = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (elementId: string, optionText: string) => {
                const element = document.querySelector(
                    `[data-llm-id="${elementId}"]`
                ) as HTMLSelectElement
                if (!element) return { success: false, error: 'Element not found' }

                const options = Array.from(element.options)
                const targetOption = options.find((opt) =>
                    opt.textContent?.toLowerCase().includes(optionText.toLowerCase())
                )

                if (!targetOption) {
                    return { success: false, error: `Option "${optionText}" not found` }
                }

                element.value = targetOption.value
                element.dispatchEvent(new Event('change', { bubbles: true }))
                return { success: true }
            },
            args: [elementId, optionText]
        })

        return result[0].result as ToolResult
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function domScroll(direction: string): Promise<ToolResult> {
    const activeTab = await getActiveTab()
    if (!activeTab?.id) {
        return { success: false, error: 'No active tab found' }
    }

    try {
        const result = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (direction: string) => {
                const scrollAmount = window.innerHeight

                switch (direction.toLowerCase()) {
                    case 'up':
                        window.scrollBy(0, -scrollAmount)
                        break
                    case 'down':
                        window.scrollBy(0, scrollAmount)
                        break
                    case 'top':
                        window.scrollTo(0, 0)
                        break
                    case 'bottom':
                        window.scrollTo(0, document.body.scrollHeight)
                        break
                    default:
                        return { success: false, error: 'Invalid direction' }
                }

                return { success: true }
            },
            args: [direction]
        })

        return result[0].result as ToolResult
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function domClear(elementId: string): Promise<ToolResult> {
    const activeTab = await getActiveTab()
    if (!activeTab?.id) {
        return { success: false, error: 'No active tab found' }
    }

    try {
        // Initialize network tracking
        await initializeNetworkTracking(activeTab.id)

        const result = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (elementId: string) => {
                const element = document.querySelector(
                    `[data-llm-id="${elementId}"]`
                ) as HTMLInputElement
                if (!element) return { success: false, error: 'Element not found' }

                element.focus()
                element.value = ''
                element.dispatchEvent(new Event('input', { bubbles: true }))
                return { success: true }
            },
            args: [elementId]
        })

        return result[0].result as ToolResult
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

// Navigation Tools
async function navigateTo(url: string): Promise<ToolResult> {
    try {
        const activeTab = await getActiveTab()
        if (!activeTab?.id) {
            return { success: false, error: 'No active tab found' }
        }

        console.log(`🔄 DEBUG: Navigating to ${url}`)
        await chrome.tabs.update(activeTab.id, { url })
        return { success: true, message: `Navigated to ${url}` }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function navigateBack(): Promise<ToolResult> {
    try {
        const activeTab = await getActiveTab()
        if (!activeTab?.id) {
            return { success: false, error: 'No active tab found' }
        }

        await chrome.tabs.goBack(activeTab.id)
        return { success: true }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function navigateForward(): Promise<ToolResult> {
    try {
        const activeTab = await getActiveTab()
        if (!activeTab?.id) {
            return { success: false, error: 'No active tab found' }
        }

        await chrome.tabs.goForward(activeTab.id)
        return { success: true }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function navigateRefresh(): Promise<ToolResult> {
    try {
        const activeTab = await getActiveTab()
        if (!activeTab?.id) {
            return { success: false, error: 'No active tab found' }
        }

        await chrome.tabs.reload(activeTab.id)
        return { success: true }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

// Tab Management Tools
async function tabsCreate(url: string): Promise<ToolResult> {
    try {
        const newTab = await chrome.tabs.create({ url })
        return { success: true, tabId: newTab.id }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function tabsClose(tabId?: number): Promise<ToolResult> {
    try {
        if (tabId) {
            // Close specific tab
            await chrome.tabs.remove(tabId)
            return { success: true }
        }
        const activeTab = await getActiveTab()
        if (!activeTab?.id) {
            return { success: false, error: 'No active tab found' }
        }

        await chrome.tabs.remove(activeTab.id)
        return { success: true }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function tabsSwitch(tabId?: number, urlPattern?: string): Promise<ToolResult> {
    try {
        let targetTab: chrome.tabs.Tab | undefined

        if (tabId) {
            targetTab = await chrome.tabs.get(tabId)
        } else if (urlPattern) {
            const tabs = await chrome.tabs.query({})
            targetTab = tabs.find(
                (tab) =>
                    tab.url?.includes(urlPattern) ||
                    tab.title?.toLowerCase().includes(urlPattern.toLowerCase())
            )
        }

        if (!targetTab?.id) {
            return { success: false, error: 'Target tab not found' }
        }

        console.log(`🔄 DEBUG: Switching to tab ${targetTab.id}: "${targetTab.title}"`)
        await chrome.tabs.update(targetTab.id, { active: true })

        // Wait a moment for the tab switch to take effect
        await new Promise((resolve) => setTimeout(resolve, 100))

        return {
            success: true,
            message: `Switched to tab: "${targetTab.title}"`,
            tabId: targetTab.id,
            tabTitle: targetTab.title,
            tabUrl: targetTab.url
        }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function tabsList(): Promise<ToolResult> {
    try {
        const tabs = await chrome.tabs.query({})
        const tabList = tabs.map((tab) => ({
            id: tab.id,
            title: tab.title,
            url: tab.url,
            active: tab.active
        }))

        return { success: true, tabs: tabList }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

// Browser API Tools
async function downloadsStart(url: string, filename?: string): Promise<ToolResult> {
    try {
        const downloadItem = await chrome.downloads.download({
            url,
            filename: filename || undefined
        })

        return { success: true, downloadId: downloadItem }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function storageSet(key: string, value: any): Promise<ToolResult> {
    try {
        await chrome.storage.local.set({ [key]: value })
        return { success: true }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function storageGet(key: string): Promise<ToolResult> {
    try {
        const result = await chrome.storage.local.get([key])
        return { success: true, value: result[key] }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

// Page Analysis Tools
async function getPageInfo(): Promise<ToolResult> {
    try {
        const activeTab = await getActiveTab()
        if (!activeTab) {
            return { success: false, error: 'No active tab found' }
        }

        return {
            success: true,
            pageInfo: {
                title: activeTab.title,
                url: activeTab.url,
                id: activeTab.id
            }
        }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

async function highlightElement(elementId: string): Promise<ToolResult> {
    const activeTab = await getActiveTab()
    if (!activeTab?.id) {
        return { success: false, error: 'No active tab found' }
    }

    try {
        const result = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (elementId: string) => {
                const element = document.querySelector(
                    `[data-llm-id="${elementId}"]`
                ) as HTMLElement
                if (!element) return { success: false, error: 'Element not found' }

                const originalStyle = element.style.cssText
                element.style.cssText += `
          outline: 3px solid #ff6b6b !important;
          outline-offset: 2px !important;
          background-color: rgba(255, 107, 107, 0.1) !important;
        `

                setTimeout(() => {
                    element.style.cssText = originalStyle
                }, 3000)

                return { success: true }
            },
            args: [elementId]
        })

        return result[0].result as ToolResult
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

// Utility Functions
async function waitForPageStabilization(): Promise<void> {
    const maxWaitTime = 3000 // Maximum wait time in milliseconds
    const checkInterval = 200 // Check every 100ms
    const startTime = Date.now()

    console.log('⏳ DEBUG: Waiting for page stabilization...')

    while (Date.now() - startTime < maxWaitTime) {
        try {
            const activeTab = await getActiveTab()
            if (!activeTab?.id) {
                console.log('❌ DEBUG: No active tab found during stabilization wait')
                break
            }

            // Check if tab is still loading
            if (activeTab.status === 'loading') {
                await new Promise((resolve) => setTimeout(resolve, checkInterval))
                continue
            }

            // For regular webpages, try to check if DOM is ready
            if (isRegularWebpage(activeTab.url)) {
                try {
                    const domReady = await chrome.scripting.executeScript({
                        target: { tabId: activeTab.id },
                        func: () => {
                            return (
                                document.readyState === 'complete' &&
                                !document.querySelector('meta[http-equiv="refresh"]') &&
                                window.location.href !== 'about:blank'
                            )
                        }
                    })

                    if (domReady[0].result) {
                        console.log('✅ DEBUG: Page stabilized')
                        // Additional small delay to ensure everything is settled
                        await new Promise((resolve) => setTimeout(resolve, 200))
                        return
                    }
                } catch (scriptError) {
                    // If script injection fails, the page might not be ready
                    console.log('⚠️ DEBUG: Script injection failed, page may not be ready')
                }
            } else {
                // For special pages (chrome://, etc), just wait a bit
                console.log('✅ DEBUG: Special page stabilized')
                await new Promise((resolve) => setTimeout(resolve, 200))
                return
            }

            await new Promise((resolve) => setTimeout(resolve, checkInterval))
        } catch (error) {
            console.error('Error during page stabilization wait:', error)
            break
        }
    }

    console.log('⏰ DEBUG: Page stabilization wait completed (may have timed out)')
}

async function waitForDOMStabilization(): Promise<void> {
    const maxWaitTimeGeneral = 3000 // Maximum wait time for general DOM operations
    const maxWaitTimeNetwork = 15_000 // Longer wait time for network requests
    const checkInterval = 50 // Check every 50ms for DOM changes
    const startTime = Date.now()

    console.log('⏳ DEBUG: Waiting for DOM stabilization...')

    const activeTab = await getActiveTab()
    if (!activeTab?.id || !isRegularWebpage(activeTab.url)) {
        console.log('✅ DEBUG: Special page or no tab, skipping DOM stabilization')
        return
    }

    while (Date.now() - startTime < maxWaitTimeNetwork) {
        try {
            const stabilityCheck = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => {
                    // Check for various indicators of pending operations
                    const checks = {
                        // Check if any fetch/XHR requests are pending
                        networkActivity: (window as any).__pendingRequests > 0,

                        // Check for loading indicators
                        loadingElements:
                            document.querySelectorAll(
                                '[class*="load"], [class*="spin"], [id*="load"], [id*="spin"]'
                            ).length > 0,

                        // Check for disabled form elements (often indicates pending operations)
                        disabledElements:
                            document.querySelectorAll(
                                'button:disabled, input:disabled, select:disabled'
                            ).length > 0,

                        // Check for common loading classes
                        commonLoadingClasses:
                            document.querySelectorAll(
                                '.loading, .spinner, .processing, .submitting, .pending'
                            ).length > 0,

                        // Check for animations/transitions
                        animatingElements:
                            document.querySelectorAll('*').length > 0
                                ? Array.from(document.querySelectorAll('*')).some((el) => {
                                      const style = window.getComputedStyle(el)
                                      return (
                                          style.animationPlayState === 'running' ||
                                          style.transitionDuration !== '0s'
                                      )
                                  })
                                : false,

                        // Check document readiness
                        documentReady: document.readyState === 'complete',

                        // Check for overlay/modal elements that might indicate loading
                        overlayElements:
                            document.querySelectorAll('.overlay, .modal, .popup, [role="dialog"]')
                                .length > 0
                    }

                    // Additional debug info
                    const debugInfo = {
                        pendingRequestsCount: (window as any).__pendingRequests || 0,
                        networkTrackingInitialized: !!(window as any).__pendingRequests,
                        documentReadyState: document.readyState,
                        loadingElementsCount: document.querySelectorAll(
                            '[class*="load"], [class*="spin"], [id*="load"], [id*="spin"]'
                        ).length,
                        disabledElementsCount: document.querySelectorAll(
                            'button:disabled, input:disabled, select:disabled'
                        ).length,
                        commonLoadingClassesCount: document.querySelectorAll(
                            '.loading, .spinner, .processing, .submitting, .pending'
                        ).length,
                        overlayElementsCount: document.querySelectorAll(
                            '.overlay, .modal, .popup, [role="dialog"]'
                        ).length
                    }

                    // Page is stable if no pending operations are detected
                    const isStable =
                        checks.documentReady &&
                        !checks.networkActivity &&
                        !checks.loadingElements &&
                        !checks.disabledElements &&
                        !checks.commonLoadingClasses &&
                        !checks.animatingElements

                    return {
                        isStable,
                        checks,
                        debugInfo,
                        timestamp: Date.now()
                    }
                }
            })

            const result = stabilityCheck[0].result
            const elapsed = Date.now() - startTime

            if (result && result.isStable) {
                console.log('✅ DEBUG: DOM stabilized after', elapsed, 'ms')
                console.log('🔍 DEBUG: Final stability state:', result.debugInfo)
                // Additional small delay to ensure everything is settled
                await new Promise((resolve) => setTimeout(resolve, 100))
                return
            } else if (result) {
                // Detailed logging of what's preventing stability
                const unstableReasons = []
                if (!result.checks.documentReady)
                    unstableReasons.push(
                        `document not ready (${result.debugInfo.documentReadyState})`
                    )
                if (result.checks.networkActivity)
                    unstableReasons.push(
                        `network activity (${result.debugInfo.pendingRequestsCount} pending)`
                    )
                if (result.checks.loadingElements)
                    unstableReasons.push(
                        `loading elements (${result.debugInfo.loadingElementsCount} found)`
                    )
                if (result.checks.disabledElements)
                    unstableReasons.push(
                        `disabled elements (${result.debugInfo.disabledElementsCount} found)`
                    )
                if (result.checks.commonLoadingClasses)
                    unstableReasons.push(
                        `loading classes (${result.debugInfo.commonLoadingClassesCount} found)`
                    )
                if (result.checks.animatingElements) unstableReasons.push('animations running')
                if (result.checks.overlayElements)
                    unstableReasons.push(
                        `overlay elements (${result.debugInfo.overlayElementsCount} found)`
                    )

                // console.log(
                //     `🔄 DEBUG: DOM unstable after ${elapsed}ms. Reasons: ${unstableReasons.join(', ')}`
                // )
                // console.log(
                //     '🔍 DEBUG: Network tracking initialized:',
                //     result.debugInfo.networkTrackingInitialized
                // )

                // Only log detailed checks every 500ms to avoid spam
                if (elapsed % 500 < 50) {
                    console.log('🔍 DEBUG: Detailed debug info:', result.debugInfo)
                }

                // Check if we should timeout early for non-network operations
                if (elapsed > maxWaitTimeGeneral && !result.checks.networkActivity) {
                    console.log(
                        '⏰ DEBUG: Non-network operations timed out after',
                        elapsed,
                        'ms, proceeding...'
                    )
                    break
                }
            }

            await new Promise((resolve) => setTimeout(resolve, checkInterval))
        } catch (error) {
            console.error('Error during DOM stabilization wait:', error)
            break
        }
    }

    console.log('⏰ DEBUG: DOM stabilization wait completed (may have timed out)')
}

function isRegularWebpage(url: string | undefined): boolean {
    if (!url) return false

    return (
        !url.startsWith('chrome://') &&
        !url.startsWith('chrome-extension://') &&
        !url.startsWith('moz-extension://') &&
        !url.startsWith('edge-extension://') &&
        !url.startsWith('about:') &&
        !url.startsWith('data:') &&
        !url.startsWith('file://')
    )
}

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        return tab || null
    } catch (error) {
        console.error('Error getting active tab:', error)
        return null
    }
}

async function ensureContentScriptReady(tabId: number): Promise<boolean> {
    try {
        // Try to ping the content script
        await chrome.tabs.sendMessage(tabId, { action: 'ping' })
        return true
    } catch (error) {
        // Content script not ready, try to inject it
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['scanner.js']
            })

            // Wait a bit for script to initialize
            await new Promise((resolve) => setTimeout(resolve, 200))

            // Try ping again
            await chrome.tabs.sendMessage(tabId, { action: 'ping' })
            return true
        } catch (injectionError) {
            console.error('Failed to inject content script:', injectionError)
            return false
        }
    }
}

async function sendToSidebar(message: SidebarMessage): Promise<void> {
    try {
        await chrome.runtime.sendMessage(message)
    } catch (error) {
        console.error('Error sending to sidebar:', error)
    }
}
