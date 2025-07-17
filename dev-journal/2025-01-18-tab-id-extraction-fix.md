# Tab ID Extraction Fix

## Issue Identified

The AI agent was failing to close tabs when given commands like "close all tabs except for mbd pay" because it was trying to use incorrect tab IDs. The error "No tab with id: 1." was occurring repeatedly.

## Root Cause Analysis

The problem was in the `buildUserPrompt` function where `tabs_list` results were being formatted for the LLM. The current formatting only showed:

```
Found 7 tabs: "Vibbly - AI-Powered Precise Transcription" (https://localhost:5173/?q=%E5%85%AB%E5%88%86), "面包多Pay" (https://p.mbd.pub/dashboard), ...
```

This formatting was **missing the actual tab IDs** that the agent needed to use with `tabs_close`. The LLM was guessing that tabs had sequential IDs like 1, 2, 3, etc., when Chrome tab IDs are actually arbitrary numbers assigned by the browser.

## Solution Implemented

### 1. Fixed Tab List Formatting

Updated the tabs_list result formatting in `buildUserPrompt` to include the actual tab IDs:

**Before:**

```typescript
resultText = `Found ${result.tabs.length} tabs: ${result.tabs.map((t: any) => `"${t.title}" (${t.url})`).join(', ')}`
```

**After:**

```typescript
resultText = `Found ${result.tabs.length} tabs: ${result.tabs.map((t: any) => `ID:${t.id} "${t.title}" (${t.url})`).join(', ')}`
```

Now the LLM sees tab information like:

```
Found 7 tabs: ID:123 "Vibbly - AI-Powered Precise Transcription" (https://localhost:5173/?q=%E5%85%AB%E5%88%86), ID:456 "面包多Pay" (https://p.mbd.pub/dashboard), ...
```

### 2. Enhanced System Prompt

Added explicit rules about tab ID handling:

- Clarified that tab IDs are NOT sequential numbers
- Emphasized the need to use tabs_list first to get real tab IDs
- Explained the format of tab ID results: "ID:123 'Title' (URL)"
- Added rule against guessing tab IDs

## Expected Behavior

With these changes:

1. The agent will see the actual Chrome tab IDs from tabs_list results
2. It will use the correct tab IDs when calling tabs_close
3. Tab closing operations should succeed instead of failing with "No tab with id: X" errors
4. The agent can properly identify which tab to keep (e.g., "mbd pay") and close all others

## Code Changes

- Modified `buildUserPrompt()` to include tab IDs in the tabs_list result formatting
- Enhanced system prompt with explicit tab ID handling rules

## Testing Recommendations

1. Test tab closing commands with multiple tabs open
2. Verify that the agent uses the correct tab IDs from tabs_list results
3. Test "close all tabs except X" commands
4. Ensure tab switching still works correctly with the new formatting
