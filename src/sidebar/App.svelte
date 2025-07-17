<script lang="ts">
    import './app.css'
    import { onMount } from 'svelte'
    import ChatContainer from './components/chat-container.svelte'
    import Header from './components/header.svelte'
    import InputContainer from './components/input-container.svelte'
    import {
        addMessage,
        loadConversationHistory,
        setProcessing,
        setStatus
    } from './stores/app-store.ts'
    import { removeBackgroundListener, setupBackgroundListener } from './utils/chrome.ts'

    let backgroundMessageHandler: ((message: any) => void) | null = null

    onMount(() => {
        // Load conversation history
        loadConversationHistory()

        // Set up background message listener
        backgroundMessageHandler = handleBackgroundMessage
        setupBackgroundListener(backgroundMessageHandler)

        console.log('AI Agent Sidebar initialized')

        // Cleanup on unmount
        return () => {
            if (backgroundMessageHandler) {
                removeBackgroundListener(backgroundMessageHandler)
            }
        }
    })

    function handleBackgroundMessage(message: any): void {
        switch (message.type) {
            case 'agentResponse':
                addMessage('agent', message.content)
                setProcessing(false)
                setStatus('ready', 'Ready')
                break

            case 'agentAction':
                setStatus('working', message.action)
                break

            case 'agentError':
                addMessage('agent', `❌ Error: ${message.error}`)
                setProcessing(false)
                setStatus('error', 'Error')
                break

            case 'agentThinking':
                setStatus('thinking', message.message || 'Thinking...')
                break

            case 'agentQuestion':
                addMessage('agent', `❓ ${message.question}`)
                setProcessing(false)
                setStatus('ready', 'Waiting for response')
                break

            case 'taskComplete':
                addMessage('agent', `✅ Task completed! ${message.message}`)
                setProcessing(false)
                setStatus('ready', 'Ready')
                break
        }
    }
</script>

<div class="flex flex-col h-screen">
    <Header />
    <ChatContainer />
    <InputContainer />
</div>

<style lang="postcss">
</style>
