<script lang="ts">
    import { agentStatus } from '../stores/app-store.ts'
    import ConfigurationPanel from './configuration-panel.svelte'
</script>

<header class="gradient-header flex items-center justify-between p-4 text-white shadow-lg">
    <div class="flex items-center gap-2 font-semibold">
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <path d="M12 2L2 7v10c0 5.55 3.84 10 9 10s9-4.45 9-10V7l-10-5z" />
            <path d="M12 22s-3-1.5-3-5v-8l3-2 3 2v8c0 3.5-3 5-3 5z" />
        </svg>
        <span>AI Agent</span>
    </div>
    <div class="status-badge {$agentStatus.type}">{$agentStatus.message}</div>
</header>

<ConfigurationPanel />

<style lang="postcss">
    @reference "tailwindcss";

    .status-badge {
        @apply rounded-full bg-white/20 px-3 py-1 text-xs font-medium;
    }

    .status-badge.thinking {
        @apply bg-amber-300/30 text-amber-100;
    }

    .status-badge.working {
        @apply bg-green-300/30 text-green-100;
    }

    .status-badge.error {
        @apply bg-red-300/30 text-red-100;
    }

    .gradient-header {
        @apply bg-gradient-to-r from-blue-500 to-purple-500;
    }
</style>
