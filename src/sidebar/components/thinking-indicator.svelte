<script lang="ts"></script>

<div class="mb-4 text-left">
    <div
        class="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md bg-white text-slate-500 italic shadow-sm flex items-center gap-2"
    >
        <span>Thinking</span>
        <div class="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    </div>
</div>

<style lang="postcss">
    .thinking-dots {
        display: flex;
        gap: 4px;
    }

    .thinking-dots span {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #94a3b8;
        animation: pulse 1.4s infinite ease-in-out;
    }

    .thinking-dots span:nth-child(1) {
        animation-delay: -0.32s;
    }
    .thinking-dots span:nth-child(2) {
        animation-delay: -0.16s;
    }

    @keyframes pulse {
        0%,
        80%,
        100% {
            transform: scale(0.8);
            opacity: 0.5;
        }
        40% {
            transform: scale(1);
            opacity: 1;
        }
    }
</style>
