<script lang="ts">
    import { get } from 'svelte/store'
    import {
        addMessage,
        clearConversation,
        isProcessing,
        setProcessing,
        setStatus,
        userInput
    } from '../stores/app-store.ts'
    import { executeCommand } from '../utils/chrome.ts'

    let charCount = $derived($userInput.length)

    async function send_message(): Promise<void> {
        if (get(isProcessing) || !$userInput.trim()) return

        const message = $userInput.trim()
        userInput.set('')

        // Add user message
        addMessage('user', message)

        // Start processing
        setProcessing(true)
        setStatus('thinking', 'Analyzing...')

        try {
            await executeCommand(message)
        } catch (error) {
            console.error('Error sending message:', error)
            addMessage('agent', 'Sorry, I encountered an error. Please try again.')
            setProcessing(false)
            setStatus('error', 'Error')
        }
    }

    function handle_key_press(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            send_message()
        }
    }

    function handle_clear_chat(): void {
        clearConversation()
    }
</script>

<div class="border-t border-slate-200/60 bg-white/95 p-5 backdrop-blur-md">
    <!-- Top gradient accent -->
    <div
        class="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"
    ></div>

    <div class="relative flex flex-col gap-3" class:opacity-90={$isProcessing}>
        <!-- Input field container -->
        <div
            class="input-field-container group relative flex items-center overflow-hidden rounded-2xl border-2 border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-1 transition-all duration-300 ease-out"
        >
            <!-- Background gradient overlay -->
            <div
                class="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-500/[0.02] opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"
            ></div>

            <input
                bind:value={$userInput}
                type="text"
                placeholder="Ask me anything..."
                maxlength="5000"
                disabled={$isProcessing}
                onkeypress={handle_key_press}
                class="relative z-10 flex-1 border-none bg-transparent px-5 py-3.5 text-[15px] font-normal text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-70"
            />

            <div class="flex items-center gap-2 pr-2">
                <button
                    class="send-button group/btn relative flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-none bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 ease-out hover:shadow-blue-500/40 disabled:transform-none disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-200 disabled:shadow-none"
                    disabled={$isProcessing || !$userInput.trim()}
                    onclick={send_message}
                    aria-label="Send message"
                >
                    <!-- Button highlight overlay -->
                    <div
                        class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100"
                    ></div>

                    {#if $isProcessing}
                        <div class="animate-spin">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-dasharray="32"
                                    stroke-dashoffset="32"
                                >
                                    <animate
                                        attributeName="stroke-dashoffset"
                                        values="32;0"
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                </circle>
                            </svg>
                        </div>
                    {:else}
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M22 2L11 13" />
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                        </svg>
                    {/if}
                </button>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div class="mt-2 flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
            <span
                class="rounded-md bg-slate-400/10 px-2 py-1 text-xs font-medium text-slate-400 transition-all duration-200"
                class:text-amber-600={charCount > 4500}
                class:bg-amber-100={charCount > 4500}
                class:text-red-600={charCount > 4900}
                class:bg-red-100={charCount > 4900}
            >
                {charCount}/5000
            </span>
        </div>

        <div class="flex items-center gap-2">
            <button
                class="group/clear flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-3 py-1.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:-translate-y-px hover:bg-slate-500/10 hover:text-slate-800 active:translate-y-0"
                onclick={handle_clear_chat}
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"
                    />
                </svg>
                Clear Chat
            </button>
        </div>
    </div>
</div>

<style lang="postcss">
    @reference "tailwindcss";

    .input-field-container:focus-within {
        @apply -translate-y-px border-blue-500/80 shadow-lg shadow-blue-500/15;
    }

    .send-button:hover:not(:disabled) {
        @apply -translate-y-0.5 bg-gradient-to-br from-blue-600 to-purple-600 shadow-xl;
    }

    .send-button:active:not(:disabled) {
        @apply translate-y-0 shadow-lg;
    }
</style>
