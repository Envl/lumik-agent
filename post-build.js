import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

// Read the HTML file from the nested directory
const htmlSource = join('dist', 'src', 'sidebar', 'index.html')
const htmlDest = join('dist', 'sidebar.html')

try {
  // Read the HTML content
  const htmlContent = readFileSync(htmlSource, 'utf8')

  // Write it to the root of dist with the new name
  writeFileSync(htmlDest, htmlContent)

  console.log('✓ Moved and renamed index.html to sidebar.html')

  // Optional: Remove the old file structure
  unlinkSync(htmlSource)
  console.log('✓ Cleaned up old HTML file')
} catch (error) {
  console.error('Error processing HTML file:', error)
  process.exit(1)
}
