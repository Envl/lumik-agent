import { get, writable } from 'svelte/store'
import { type LLMConfig, type LLMProvider } from '../services/llm-service'

export interface AgentStatus {
    type: 'ready' | 'thinking' | 'working' | 'error'
    message: string
}

export interface Message {
    id: string
    sender: 'user' | 'agent'
    content: string
    type: 'text' | 'html'
    timestamp: string
}

// Svelte stores
export const agentStatus = writable<AgentStatus>({
    type: 'ready',
    message: 'Ready'
})

export const isProcessing = writable<boolean>(false)

export const conversationHistory = writable<Message[]>([])

export const userInput = writable<string>('')

// LLM Configuration stores
export const llm_config = writable<LLMConfig | null>(null)
export const selected_provider = writable<LLMProvider>('openai')
export const is_llm_configured = writable<boolean>(false)

// Helper functions
export function setStatus(type: AgentStatus['type'], message: string): void {
    agentStatus.set({ type, message })
}

export function setProcessing(processing: boolean): void {
    isProcessing.set(processing)
}

export function addMessage(
    sender: Message['sender'],
    content: string,
    type: Message['type'] = 'text'
): void {
    const message: Message = {
        id: Date.now() + Math.random().toString(),
        sender,
        content,
        type,
        timestamp: new Date().toLocaleTimeString()
    }

    conversationHistory.update((history) => [...history, message])

    // Save to chrome storage
    saveConversationHistory()
}

export function clearConversation(): void {
    conversationHistory.set([])
    saveConversationHistory()
}

function saveConversationHistory(): void {
    conversationHistory.subscribe((history) => {
        if (chrome?.storage?.local) {
            chrome.storage.local.set({ conversationHistory: history })
        }
    })()
}

export async function loadConversationHistory(): Promise<void> {
    if (chrome?.storage?.local) {
        try {
            const result = await chrome.storage.local.get(['conversationHistory'])
            if (result.conversationHistory && result.conversationHistory.length > 0) {
                conversationHistory.set(result.conversationHistory)
            }
        } catch (error) {
            console.error('Error loading conversation history:', error)
        }
    }
}

// LLM Configuration helper functions
export async function load_llm_config(): Promise<void> {
    if (chrome?.storage?.local) {
        try {
            const result = await chrome.storage.local.get(['llmConfig'])
            if (result.llmConfig) {
                llm_config.set(result.llmConfig)
                console.log('LLM config loaded:', get(llm_config))
                is_llm_configured.set(true)
            } else {
                is_llm_configured.set(false)
            }
        } catch (error) {
            console.error('Error loading LLM config:', error)
            is_llm_configured.set(false)
        }
    }
}

export async function save_llm_config(config: LLMConfig): Promise<void> {
    if (chrome?.storage?.local) {
        try {
            await chrome.storage.local.set({ llmConfig: config })
            llm_config.set(config)
            is_llm_configured.set(true)
        } catch (error) {
            console.error('Error saving LLM config:', error)
            throw error
        }
    }
}
