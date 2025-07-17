# Testing Guide for Lumik Agent

## Manual Testing Steps

### 1. Extension Installation

- [ ] Load unpacked extension in Chrome
- [ ] Extension icon appears in toolbar
- [ ] Sidebar opens when icon is clicked

### 2. Configuration Panel

- [ ] "LLM Not Configured" shows initially
- [ ] "Configure" button opens modal
- [ ] Provider selection works (OpenAI-compatible)
- [ ] API key input accepts text
- [ ] Model selection updates based on provider
- [ ] Temperature/tokens inputs work
- [ ] "Save Configuration" works
- [ ] Status changes to "LLM Configured"

### 3. Basic LLM Integration

- [ ] Enter simple command like "What can you see on this page?"
- [ ] Agent shows "Analyzing your request..."
- [ ] Agent shows "Scanning page..."
- [ ] Agent shows "Reasoning about next action..."
- [ ] Agent provides response about page content

### 4. Tool Selection Testing

- [ ] Command: "Click the search button" → should use dom_click
- [ ] Command: "Go to google.com" → should use navigate_to
- [ ] Command: "What's on this page?" → should use page_scan
- [ ] Command: "Open a new tab" → should use tabs_create

### 5. Error Handling

- [ ] Invalid API key → should show configuration error
- [ ] No internet → should show connection error
- [ ] Complex command → should ask for clarification
- [ ] Unknown element → should provide helpful message

### 6. Multi-Step Tasks

- [ ] Command: "Search for 'AI news' on Google"
    - Should navigate to Google
    - Should find search box
    - Should type "AI news"
    - Should click search button
    - Should confirm completion

## Test Pages

### Simple Test Page

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Test Page</title>
    </head>
    <body>
        <h1>Test Page</h1>
        <button id="test-btn">Test Button</button>
        <input type="text" id="test-input" placeholder="Enter text" />
        <a href="https://google.com">Google Link</a>
    </body>
</html>
```

### Common Test Commands

- "Click the test button"
- "Type 'hello world' in the input"
- "Go to Google"
- "What elements can you see?"
- "Open a new tab with Wikipedia"
- "Take a screenshot"
- "What's the page title?"

## Expected Behaviors

### Configuration

- Status indicator should update based on API key presence
- Provider switching should update model options
- Settings should persist between sessions

### LLM Responses

- Should be in JSON format internally
- Should choose appropriate tools
- Should provide reasoning for actions
- Should handle errors gracefully

### Tool Execution

- DOM tools should work on current page
- Navigation tools should change page/tab
- Page scanning should return element info
- Task completion should show success message

## Debugging Tips

### Check Console Logs

- Background script logs: `chrome://extensions/` → Extension details → Service worker → Console
- Sidebar logs: Right-click sidebar → Inspect
- Content script logs: F12 → Console on any page

### TypeScript Development

- Run `pnpm typecheck` to check for type errors
- Use `pnpm build:watch` for development with auto-rebuild
- All files are fully typed - leverage IDE autocomplete
- Check `dist/` folder for compiled JavaScript output

### Common Issues

- API key not saved: Check Chrome storage in devtools
- Tool not found: Check available tools list in `background.ts`
- Element not found: Check data-llm-id attributes
- Network error: Check API endpoint and key
- Type errors: Run `pnpm typecheck` to identify issues

### Testing Without Real API

- Can modify `background.ts` to return mock responses in the `callLLM` function
- Useful for testing tool selection logic
- Can simulate different response types
- Use TypeScript interfaces to ensure mock data matches expected types

## Success Criteria

The extension should:

1. ✅ Load without errors
2. ✅ Accept and save API configuration
3. ✅ Make successful API calls to LLM
4. ✅ Parse LLM responses correctly
5. ✅ Execute appropriate tools
6. ✅ Provide user feedback
7. ✅ Handle errors gracefully
8. ✅ Complete multi-step tasks

Ready to test Lumik Agent! 🚀
