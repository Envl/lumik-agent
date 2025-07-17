# Development Hot-Reload Guide

This guide explains how to use the hot-reload system for faster development of the LLM Browser Extension.

## Quick Start

To start development with hot-reload:

```bash
pnpm run dev:hotreload
```

This will:
1. Build the extension initially
2. Watch for file changes in `src/`, `content_scripts/`, `background.ts`, `manifest.json`, and `icons/`
3. Automatically rebuild when changes are detected
4. Provide instructions for reloading the extension in Chrome

## Available Scripts

### `pnpm run dev:hotreload`
Starts the hot-reload development server that watches for file changes and automatically rebuilds the extension.

### `pnpm run dev:reload`
Helper script that provides instructions for manually reloading the extension in Chrome.

### `pnpm run build`
Production build of the extension.

### `pnpm run build:watch`
Builds the extension and watches for changes (without hot-reload features).

## How It Works

### File Watching
The hot-reload script monitors these directories and files:
- `src/` - All Svelte components and TypeScript files
- `content_scripts/` - Content script files
- `background.ts` - Background script
- `manifest.json` - Extension manifest
- `icons/` - Extension icons

### Build Process
When a file change is detected:
1. The system waits 300ms (debounce) to group multiple changes
2. Runs `pnpm run build` to rebuild the extension
3. Copies files to the `dist/` directory
4. Runs the post-build script to organize files
5. Provides reload instructions

### Extension Reloading
After each build, you need to manually reload the extension in Chrome:
1. Open `chrome://extensions`
2. Find your extension
3. Click the refresh/reload button
4. Or use `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac)

## Development Workflow

1. **Start the hot-reload server:**
   ```bash
   pnpm run dev:hotreload
   ```

2. **Make changes to your code** - the system will automatically detect changes and rebuild

3. **Reload the extension** in Chrome when you see the build success message

4. **Test your changes** in the browser

## Tips for Efficient Development

### File Organization
- Keep related files together to minimize the number of files that need to be rebuilt
- Use TypeScript for better error detection during development

### Browser Extension Development
- Keep the Chrome DevTools open for both the extension (sidebar) and the background script
- Use `chrome://extensions` in a pinned tab for quick access
- Enable "Developer mode" in `chrome://extensions` for additional debugging features

### Debugging
- Background script logs: Check the "service worker" link in `chrome://extensions`
- Content script logs: Check the page's DevTools console
- Sidebar logs: Right-click the sidebar and select "Inspect"

## Troubleshooting

### Build Errors
- Check the terminal output for TypeScript or build errors
- Ensure all dependencies are installed with `pnpm install`
- Verify file paths and imports are correct

### Extension Not Updating
- Make sure to reload the extension in `chrome://extensions` after each build
- Check that the extension is enabled
- Try disabling and re-enabling the extension if issues persist

### Performance Issues
- The hot-reload system debounces changes to avoid excessive rebuilds
- If builds are slow, consider excluding large directories from watching
- Use `pnpm run build` for production builds (more optimized)

## File Structure

```
scripts/
├── dev-hotreload.js     # Main hot-reload script
└── reload-extension.js  # Helper for extension reloading

dist/                    # Built extension files
├── sidebar.html         # Sidebar HTML
├── background.js        # Background script
├── scanner.js           # Content script
├── manifest.json        # Extension manifest
└── icons/               # Extension icons
```

## Future Enhancements

The hot-reload system could be enhanced with:
- Automatic extension reloading (requires additional Chrome Extension API setup)
- Live reload for CSS/styling changes
- Integration with Chrome Extension Developer Tools
- Hot module replacement for faster rebuilds

## Contributing

When making changes to the hot-reload system:
1. Test with various file types (TypeScript, Svelte, CSS, etc.)
2. Ensure the debouncing works correctly
3. Verify error handling for build failures
4. Update this documentation if behavior changes
