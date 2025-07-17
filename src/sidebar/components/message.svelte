<script lang="ts">
    import type { Message } from '../stores/app-store.ts'

    type Props = {
        message: Message
    }

    let { message }: Props = $props()
</script>

<div class="message {message.sender}">
    <div class="message-content">
        {#if message.type === 'html'}
            {@html message.content}
        {:else}
            {message.content}
        {/if}
    </div>
    <div class="message-time">{message.timestamp}</div>
</div>

<style lang="postcss">
    @reference "tailwindcss";

    .message {
        @apply mb-4;
        animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .message.user {
        @apply text-right;
    }

    .message.agent {
        @apply text-left;
    }

    .message-content {
        @apply inline-block max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words;
    }

    .message.user .message-content {
        @apply rounded-br-md bg-blue-500 text-white;
    }

    .message.agent .message-content {
        @apply rounded-bl-md bg-white text-slate-800 shadow-sm;
    }

    .message-time {
        @apply mt-1 text-xs text-slate-400;
    }
</style>
