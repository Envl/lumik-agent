<script lang="ts"></script>

<div class="welcome-message">
    <p>👋 Hi! I'm Lumik Agent. I can help you with any task on the web.</p>
    <p>Try commands like:</p>
    <ul>
        <li>"Send a tweet saying hello"</li>
        <li>"Search for React tutorials"</li>
        <li>"Fill out this form with my info"</li>
        <li>"Download this PDF"</li>
    </ul>
</div>

<style lang="postcss">
    .welcome-message {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #667eea;
    }

    .welcome-message p {
        margin-bottom: 12px;
        line-height: 1.5;
    }

    .welcome-message ul {
        list-style: none;
        padding-left: 0;
    }

    .welcome-message li {
        padding: 8px 0;
        padding-left: 20px;
        position: relative;
        color: #64748b;
        font-size: 14px;
    }

    .welcome-message li:before {
        content: '→';
        position: absolute;
        left: 0;
        color: #667eea;
        font-weight: bold;
    }
</style>
