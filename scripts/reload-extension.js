#!/usr/bin/env node

// Helper script to reload Chrome extension during development
// This script can be called manually or from the hot-reload script

const reloadExtension = async () => {
  try {
    console.log('📦 Attempting to reload extension...')
    console.log('🔄 If this doesn\'t work, please reload manually in chrome://extensions')

    // For now, just show instructions
    console.log('\n📋 Manual reload instructions:')
    console.log('1. Open chrome://extensions')
    console.log('2. Find your extension')
    console.log('3. Click the refresh/reload button')
    console.log('4. Or use the keyboard shortcut: Ctrl+R (Cmd+R on Mac)')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  reloadExtension()
}

export { reloadExtension }
