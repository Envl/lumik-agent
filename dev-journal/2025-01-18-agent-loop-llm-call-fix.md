# Agent Loop LLM Call Fix

## Problem

The agent is getting stuck in an infinite loop calling the LLM with empty messages. This happens because:

1. `agentLoop` function calls `callLLM` with a manually built prompt using `buildMasterPrompt`
2. `callLLM` completely ignores the passed prompt parameter and builds its own using conversation history
3. Since `agentLoop` is a separate flow from normal chat, the conversation history might be empty or incorrect
4. This results in empty messages being sent to the LLM, causing repeated calls and eventual timeout

## Root Cause

The issue is in the `callLLM` function signature and implementation:

```typescript
async function callLLM(_prompt: string): Promise<LLMResponse> {
    // ... ignores _prompt parameter completely
    // Uses conversationHistory instead
    const conversationHistory = await getConversationHistory()
    const decision = await llmBridge.decideAction(
        agentState.currentTask!,
        pageContext.success ? pageContext.data : {},
        conversationHistory,
        AVAILABLE_TOOLS
    )
}
```

The `_prompt` parameter is prefixed with underscore indicating it's unused, but `agentLoop` still passes it.

## Critical Fix - Empty Messages Bug

**ISSUE IDENTIFIED**: The `callLLM` function was causing infinite loops by sending empty messages to the LLM API!

**Root Cause**: The configuration check was calling `llmBridge.makeRequest([])` with an empty array, which sent `{"messages": []}` to the API, causing 400 errors.

**Evidence from network logs**:

- Success request: Proper system + user prompt with full context
- Failed request: `{"messages":[],"temperature":0.1,"max_tokens":1000}` (empty messages array)

**Fix Applied**:

1. Added public `isConfiguredProperly()` method to LLMBridge class
2. Replaced the problematic empty `makeRequest([])` call with proper configuration checking
3. Eliminated the source of empty message API calls

**Code Changes**:

```typescript
// Before (PROBLEMATIC):
try {
    await llmBridge.makeRequest([]) // This sends empty messages to API!
} catch (error) {
    if ((error as Error).message.includes('not configured')) {
        return { success: false, error: 'LLM not configured...' }
    }
}

// After (FIXED):
if (!llmBridge.isConfiguredProperly()) {
    return { success: false, error: 'LLM not configured...' }
}
```

This fix should eliminate the interleaved empty message API calls that were causing the infinite loops.

## Solution

Fixed the agent architecture to properly follow the **Vision → Reasoning → Action → Loop** pattern as described in the README:

1. **Restored proper agent architecture**: `agentLoop` now handles Vision (page scanning) and passes context to LLM for Reasoning
2. **Simplified `callLLM` function**: Now focused only on reasoning - takes context as parameters instead of gathering it internally
3. **Enhanced context passing**: Added recent actions to LLM decision making for better continuity
4. **Cleaner separation of concerns**: Each function has a single responsibility

## Implementation

### Updated Architecture Flow:

```
1. VISION (agentLoop): Scan page, get context, gather conversation history
2. REASONING (callLLM): Use provided context to make decisions
3. ACTION (agentLoop): Execute chosen tool
4. LOOP (agentLoop): Continue until task complete
```

### Updated `agentLoop` function:

```typescript
async function agentLoop(command: string): Promise<void> {
    while (currentStep < maxSteps && agentState.isProcessing) {
        // 1. VISION: Get current page content
        const pageContent = await scanCurrentPage()
        const pageContextData = // ... create PageContext object
        const conversationHistory = await getConversationHistory()

        // 2. REASONING: Call LLM with context
        const llmResponse = await callLLM(
            command,
            pageContextData,
            conversationHistory,
            agentState.getRecentActions()
        )

        // 3. ACTION: Execute the chosen tool
        const result = await executeTool(action)

        // 4. LOOP: Continue or break based on result
    }
}
```

### Simplified `callLLM` function:

```typescript
async function callLLM(
    userCommand: string,
    pageContext: PageContext,
    conversationHistory: ConversationMessage[],
    recentActions: AgentAction[]
): Promise<LLMResponse> {
    // Only handles reasoning - no context gathering
    const decision = await llmBridge.decideAction(
        userCommand,
        pageContext,
        conversationHistory,
        recentActions,
        AVAILABLE_TOOLS
    )
    // Convert and return decision
}
```

### Enhanced LLM Bridge:

```typescript
private buildUserPrompt(
    userCommand: string,
    pageContext: any,
    conversationHistory: any[],
    recentActions: AgentAction[]
): string {
    // Now includes recent actions for better context
    return `User Command: "${userCommand}"

    Current Page Context: ...
    Recent Conversation: ...
    Recent Actions: ${actionsText}

    What should I do next?`
}
```

### Benefits of this approach:

- **Proper architecture**: Follows the documented Vision → Reasoning → Action → Loop pattern
- **Better separation of concerns**: Each function has a single, clear responsibility
- **Enhanced context**: LLM gets complete context including recent actions for better decision making
- **Maintainable**: Clear flow that's easy to understand and debug
- **Consistent**: Matches the architecture described in the README

## Date

January 18, 2025
