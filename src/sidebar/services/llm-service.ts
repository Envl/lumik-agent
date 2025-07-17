export type LLMProvider = 'openai'

export interface LLMConfig {
    provider: LLMProvider
    apiKey: string
    apiUrl?: string
    model: string
    temperature: number
    maxTokens: number
}

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface LLMResponse {
    content: string
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

export interface ToolCall {
    name: string
    args: Record<string, any>
    reasoning?: string
}

export interface AgentDecision {
    action: 'use_tool' | 'respond' | 'ask_question' | 'task_complete'
    tool_call?: ToolCall
    response?: string
    question?: string
    completion_message?: string
}

export class LLMService {
    private config: LLMConfig | null = null

    constructor() {
        this.loadConfig()
    }

    async loadConfig(): Promise<void> {
        try {
            const result = await chrome.storage.local.get(['llmConfig'])
            this.config = result.llmConfig || null
        } catch (error) {
            console.error('Error loading LLM config:', error)
        }
    }

    async saveConfig(config: LLMConfig): Promise<void> {
        this.config = config
        await chrome.storage.local.set({ llmConfig: config })
    }

    isConfigured(): boolean {
        return this.config !== null && this.config.apiKey.length > 0
    }

    async makeRequest(messages: LLMMessage[]): Promise<LLMResponse> {
        if (!this.config) {
            throw new Error('LLM not configured')
        }

        return this.makeOpenAICompatibleRequest(messages)
    }

    private async makeOpenAICompatibleRequest(messages: LLMMessage[]): Promise<LLMResponse> {
        const api_url = this.config!.apiUrl || 'https://api.openai.com/v1'
        const response = await fetch(`${api_url}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.config!.apiKey}`
            },
            body: JSON.stringify({
                model: this.config!.model,
                messages: messages,
                temperature: this.config!.temperature,
                max_tokens: this.config!.maxTokens
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
        availableTools: Record<string, string>
    ): Promise<AgentDecision> {
        const systemPrompt = this.buildSystemPrompt(availableTools)
        const userPrompt = this.buildUserPrompt(userCommand, pageContext, conversationHistory)

        const messages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]

        const response = await this.makeRequest(messages)
        return this.parseAgentDecision(response.content)
    }

    private buildSystemPrompt(availableTools: Record<string, string>): string {
        const toolsList = Object.entries(availableTools)
            .map(([name, description]) => `- ${name}: ${description}`)
            .join('\n')

        return `You are Lumik Agent, an AI assistant that helps users perform tasks on websites. Your job is to:

1. Understand the user's command
2. Analyze the current page context
3. Decide on the next action to take

You have access to these tools:
${toolsList}

IMPORTANT RULES:
- Always think step by step
- Only use one tool at a time
- If you need more information, ask the user
- If the page needs to be scanned first, use page_scan
- When clicking elements, use their elementId from the page scan
- Complete the task when the user's goal is achieved

Response format: You must respond with a JSON object containing:
{
  "action": "use_tool" | "respond" | "ask_question" | "task_complete",
  "tool_call": { "name": "tool_name", "args": {...}, "reasoning": "why this tool" },
  "response": "message to user",
  "question": "question for user",
  "completion_message": "task completed message"
}

Examples:
- To click a button: {"action": "use_tool", "tool_call": {"name": "dom_click", "args": {"elementId": "llm-5"}, "reasoning": "clicking the login button"}}
- To ask for clarification: {"action": "ask_question", "question": "Which search term would you like me to use?"}
- To complete task: {"action": "task_complete", "completion_message": "Successfully logged in to the website"}
- To respond normally: {"action": "respond", "response": "I can see the page has loaded successfully"}`
    }

    private buildUserPrompt(
        userCommand: string,
        pageContext: any,
        conversationHistory: any[]
    ): string {
        const historyText = conversationHistory
            .slice(-5) // Last 5 messages
            .map((msg) => `${msg.sender}: ${msg.content}`)
            .join('\n')

        return `User Command: "${userCommand}"

Current Page Context:
- URL: ${pageContext.url || 'Unknown'}
- Title: ${pageContext.title || 'Unknown'}
- Available Elements: ${JSON.stringify(pageContext.elements || [], null, 2)}

Recent Conversation:
${historyText}

What should I do next?`
    }

    private parseAgentDecision(content: string): AgentDecision {
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

            return decision as AgentDecision
        } catch (error) {
            console.error('Error parsing agent decision:', error)
            // Fallback to a simple response
            return {
                action: 'respond',
                response: content
            }
        }
    }

    getDefaultConfigs(): Record<LLMProvider, LLMConfig> {
        // Default configurations for supported LLM providers
        return {
            openai: {
                provider: 'openai',
                apiKey: '',
                apiUrl: 'https://api.openai.com/v1',
                model: 'gpt-4o-mini',
                temperature: 0.1,
                maxTokens: 1000
            }
        }
    }
}

export const llmService = new LLMService()
