<script lang="ts">
    import { conversationHistory, isProcessing } from '../stores/app-store.ts'
    import Message from './message.svelte'
    import ThinkingIndicator from './thinking-indicator.svelte'
    import WelcomeMessage from './welcome-message.svelte'

    let chatContainer: HTMLDivElement

    // Auto-scroll to bottom when new messages are added
    $effect(() => {
        if ($conversationHistory.length > 0 && chatContainer) {
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight
            }, 100)
        }
    })
</script>

<div class="chat-container" bind:this={chatContainer}>
    {#if $conversationHistory.length === 0}
        <WelcomeMessage />
    {:else}
        {#each $conversationHistory as message (message.id)}
            <Message {message} />
        {/each}
    {/if}

    {#if $isProcessing}
        <ThinkingIndicator />
    {/if}
</div>

<style lang="postcss">
    @reference "tailwindcss";

    .chat-container {
        @apply flex-1 overflow-y-auto p-5;
        scroll-behavior: smooth;
    }

    /* Scrollbar styling */
    .chat-container::-webkit-scrollbar {
        width: 6px;
    }

    .chat-container::-webkit-scrollbar-track {
        @apply bg-slate-100;
    }

    .chat-container::-webkit-scrollbar-thumb {
        @apply rounded-sm bg-slate-300;
    }

    .chat-container::-webkit-scrollbar-thumb:hover {
        @apply bg-slate-400;
    }
</style>
