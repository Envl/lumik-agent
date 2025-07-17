# Enhanced Page Scanning URL Validation

## Overview

Improved the `scanCurrentPage` function to better handle special page types and provide more graceful error handling.

## Changes Made

### 1. Enhanced URL Validation

Extended the URL validation in `scanCurrentPage` to exclude more special page types:

- `chrome://` - Chrome internal pages
- `chrome-extension://` - Chrome extension pages
- `moz-extension://` - Firefox extension pages
- `edge-extension://` - Edge extension pages
- `about:` - Browser about pages
- `data:` - Data URLs
- `file://` - Local file URLs

### 2. Improved Error Handling in Agent Loop

Modified the `agentLoop` function to handle unsupported page types more gracefully:

- Added conditional page scanning logic similar to `callLLM` function
- Before calling `scanCurrentPage()`, checks if the current tab is a normal webpage
- If the tab is a special page type, shows a clear error message and stops processing
- This prevents the agent from getting stuck in an error loop when on special pages
- Ensures proper `PageContext` object is created even for unsupported pages

### 3. Conditional Page Scanning in LLM Context

Added conditional page scanning in the `callLLM` function:

- Before calling `scanCurrentPage()`, the function now checks if the current tab is a normal webpage
- If the tab is a special page type (chrome://, extensions, etc.), it skips the page scan and uses empty context
- This prevents unnecessary scanning attempts on unsupported pages during LLM decision making

### 4. Code Refactoring for DRY Principle

Created a helper function `isRegularWebpage()` to eliminate code duplication:

- The URL validation logic was repeated in multiple places (agentLoop, callLLM, scanCurrentPage)
- Refactored into a single reusable function that returns a boolean
- Improved maintainability and consistency across the codebase

### 5. Enhanced Agent Functionality on Special Pages

Modified the agent to continue working on special pages without DOM scanning:

- Instead of completely stopping on special pages, the agent now continues processing
- DOM tools are unavailable on special pages, but navigation, tab management, and storage tools still work
- Updated system prompt to inform the LLM about limitations on special pages
- Enhanced user prompt to provide context about special page limitations

## Code Changes

### Enhanced Agent Loop Logic:

```typescript
if (!pageContent.success) {
    // Check if it's a special page type that can't be scanned
    if (
        pageContent.error?.includes('Cannot scan this page type') ||
        pageContent.error?.includes('Unsupported page type')
    ) {
        // Continue without page content - agent can still do tab management, navigation, etc.
        console.log('Special page detected, continuing without page content')
    } else {
        // For other errors, still throw
        throw new Error('Failed to scan page: ' + pageContent.error)
    }
}
```

### Updated System Prompt:

```typescript
IMPORTANT RULES:
- Always think step by step
- Only use one tool at a time
- If you need more information, ask the user
- If the page needs to be scanned first, use page_scan
- When clicking elements, use their elementId from the page scan
- Complete the task when the user's goal is achieved
- On special pages (chrome://, extensions, etc.), DOM tools won't work but you can still use navigation, tab management, and storage tools
```

### Helper Function:

```typescript
function isRegularWebpage(url: string | undefined): boolean {
    if (!url) return false

    return (
        !url.startsWith('chrome://') &&
        !url.startsWith('chrome-extension://') &&
        !url.startsWith('moz-extension://') &&
        !url.startsWith('edge-extension://') &&
        !url.startsWith('about:') &&
        !url.startsWith('data:') &&
        !url.startsWith('file://')
    )
}
```

### In `scanCurrentPage` function:

```typescript
// Check if tab is a valid web page (not chrome:// or other special URLs)
if (!isRegularWebpage(activeTab.url)) {
    return {
        success: false,
        error: 'Cannot scan this page type. Please navigate to a regular webpage.'
    }
}
```

### In `agentLoop` function:

```typescript
// 1. VISION: Get current page content - only scan if it's a normal webpage
await sendToSidebar({ type: 'agentAction', action: 'Scanning page...' })
let pageContent = { success: false, data: {}, error: 'Unsupported page type' }

const activeTab = await getActiveTab()
if (activeTab?.url && isRegularWebpage(activeTab.url)) {
    pageContent = await scanCurrentPage()
}

if (!pageContent.success) {
    // Check if it's a special page type that can't be scanned
    if (
        pageContent.error?.includes('Cannot scan this page type') ||
        pageContent.error?.includes('Unsupported page type')
    ) {
        await sendToSidebar({
            type: 'agentError',
            error: 'Cannot use the agent on this page type. Please navigate to a regular webpage.'
        })
        break
    }
    throw new Error('Failed to scan page: ' + pageContent.error)
}
```

### In `callLLM` function:

```typescript
// Get current page context - only scan if it's a normal webpage
let pageContext = { success: false, data: {} }

const activeTab = await getActiveTab()
if (
    activeTab?.url &&
    !activeTab.url.startsWith('chrome://') &&
    !activeTab.url.startsWith('chrome-extension://') &&
    !activeTab.url.startsWith('moz-extension://') &&
    !activeTab.url.startsWith('edge-extension://') &&
    !activeTab.url.startsWith('about:') &&
    !activeTab.url.startsWith('data:') &&
    !activeTab.url.startsWith('file://')
) {
    pageContext = await scanCurrentPage()
}
```

### In `callLLM` function:

```typescript
// Get current page context - only scan if it's a normal webpage
let pageContext = { success: false, data: {} }

const activeTab = await getActiveTab()
if (activeTab?.url && isRegularWebpage(activeTab.url)) {
    pageContext = await scanCurrentPage()
}
```

## Benefits

1. **Better User Experience**: Clear error messages when trying to use the agent on unsupported pages
2. **Prevents Errors**: Avoids attempting to inject content scripts on pages where it's not allowed
3. **Cross-Browser Compatibility**: Handles extension URLs for different browsers
4. **Security**: Prevents potential issues with data URLs and local files
5. **Performance**: Skips unnecessary page scanning on special pages during LLM context gathering
6. **Code Quality**: Eliminated code duplication through DRY refactoring
7. **Enhanced Functionality**: Agent can still perform non-DOM tasks on special pages like tab management, navigation, and storage operations

## Testing

- Test on various special page types to ensure proper error handling
- Verify that normal webpages still work correctly
- Check that the agent gracefully exits when encountering unsupported pages

## Date

January 18, 2025
