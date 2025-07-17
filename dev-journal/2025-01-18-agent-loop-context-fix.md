# Agent Loop Context Fix - Tool Results Missing

## Problem

The agent was getting stuck in infinite loops when calling `tabs_list`. Even after fixing the empty messages API call issue, the agent would repeatedly call the same tool (like `tabs_list`) instead of using the results from previous calls.

Network logs showed the agent making the same API call over and over:

```
Recent Actions:
tabs_list: The user wants to retry navigating to the 'vibbily' tab. To do this, I need to first list all open tabs to find the correct one.
tabs_list: The user wants to retry navigating to the 'vibbily' tab. To do this, I need to first list all open tabs to find the correct one.
tabs_list: The user wants to retry navigating to the 'vibbily' tab. To do this, I need to first list all open tabs to find the correct one.
```

## Root Cause

The issue was in the `buildUserPrompt` method. It was only including action names and reasoning in the context, but **not the results** of those actions. This meant the LLM couldn't see what happened after calling `tabs_list`, so it kept calling it again.

## Fix Applied

Updated the prompt building to include tool results:

**Before**:

```typescript
const actionsText = recentActions
    .map((actionItem) => `${actionItem.action.tool_name}: ${actionItem.action.reasoning}`)
    .join('\n')
```

**After**:

```typescript
const actionsText = recentActions
    .map((actionItem) => {
        const result = actionItem.result
        const resultText = result.success
            ? result.tabs
                ? `Found ${result.tabs.length} tabs: ${result.tabs.map((t: any) => `"${t.title}" (${t.url})`).join(', ')}`
                : result.message || 'Success'
            : `Error: ${result.error}`
        return `${actionItem.action.tool_name}: ${actionItem.action.reasoning} → ${resultText}`
    })
    .join('\n')
```

## Impact

Now the LLM context will include:

- What action was taken
- Why it was taken (reasoning)
- What the result was (success/failure, actual data)

For example, instead of just:

```
tabs_list: Need to find the youtube tab
```

The LLM will now see:

```
tabs_list: Need to find the youtube tab → Found 5 tabs: "Extensions" (chrome://extensions/), "Gmail" (https://mail.google.com), "youtube" (https://youtube.com), "GitHub" (https://github.com), "Stack Overflow" (https://stackoverflow.com)
```

This allows the agent to use the results from previous actions instead of repeating them.

## Status

✅ Fix implemented and compiled successfully
⏳ Awaiting user testing to confirm infinite loop resolution
