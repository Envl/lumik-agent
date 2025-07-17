#!/usr/bin/env node

import { spawn } from 'child_process'
import { watch } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

function log(color, prefix, message) {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`${colors.bright}[${timestamp}]${colors.reset} ${color}${prefix}${colors.reset} ${message}`)
}

function logInfo(message) {
  log(colors.blue, '[INFO]', message)
}

function logSuccess(message) {
  log(colors.green, '[SUCCESS]', message)
}

function logWarning(message) {
  log(colors.yellow, '[WARNING]', message)
}

function logError(message) {
  log(colors.red, '[ERROR]', message)
}

function logBuild(message) {
  log(colors.cyan, '[BUILD]', message)
}

class HotReloader {
  constructor() {
    this.viteProcess = null
    this.isBuilding = false
    this.buildQueue = false
    this.watchedDirs = [
      'src',
      'content_scripts',
      'background.ts',
      'manifest.json',
      'icons'
    ]
  }

  async start() {
    logInfo('🔥 LLM Browser Extension - Hot Reload Server')
    logInfo('=========================================')
    logInfo('Starting hot-reload development server...')

    // Initial build
    await this.build()

    // Start watching for changes
    this.startWatching()

    logSuccess('Hot-reload server started! �')
    logInfo('👀 Watching for file changes...')
    logInfo('⏹️  Press Ctrl+C to stop')
    logInfo('')
  }

  async build() {
    if (this.isBuilding) {
      this.buildQueue = true
      return
    }

    this.isBuilding = true
    logBuild('Building extension...')

    try {
      // Run Vite build
      await this.runCommand('pnpm', ['run', 'build'])

      logSuccess('Extension built successfully!')

      // Show reload instructions
      await this.reloadExtension()

    } catch (error) {
      logError(`Build failed: ${error.message}`)
    } finally {
      this.isBuilding = false

      // Process queued build if any
      if (this.buildQueue) {
        this.buildQueue = false
        setTimeout(() => this.build(), 100)
      }
    }
  }

  startWatching() {
    this.watchedDirs.forEach(dir => {
      const fullPath = join(rootDir, dir)

      try {
        watch(fullPath, { recursive: true }, (_eventType, filename) => {
          if (filename) {
            // Filter out certain files/directories
            if (this.shouldIgnoreFile(filename)) {
              return
            }

            logInfo(`📝 File changed: ${filename}`)

            // Debounce builds
            clearTimeout(this.buildTimeout)
            this.buildTimeout = setTimeout(() => {
              this.build()
            }, 300)
          }
        })

        logInfo(`Watching: ${dir}`)
      } catch (error) {
        logWarning(`Could not watch ${dir}: ${error.message}`)
      }
    })
  }

  shouldIgnoreFile(filename) {
    const ignorePatterns = [
      /node_modules/,
      /\.git/,
      /dist/,
      /\.DS_Store/,
      /\.log$/,
      /\.tmp$/,
      /~$/,
      /\.swp$/,
      /\.lock$/,
    ]

    return ignorePatterns.some(pattern => pattern.test(filename))
  }

  async reloadExtension() {
    try {
      logInfo('Extension built successfully! 🎉')
      logInfo('📋 To see your changes:')
      logInfo('   1. Open chrome://extensions')
      logInfo('   2. Click the refresh button on your extension')
      logInfo('   3. Or press Ctrl+R (Cmd+R on Mac) while focused on the extension')

    } catch {
      logWarning('Could not auto-reload extension. Please reload manually in chrome://extensions')
    }
  }

  runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: rootDir,
        stdio: 'pipe'
      })

      let stdout = ''
      let stderr = ''

      process.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(`Process exited with code ${code}\n${stderr}`))
        }
      })

      process.on('error', (error) => {
        reject(error)
      })
    })
  }

  stop() {
    if (this.viteProcess) {
      this.viteProcess.kill()
    }
    logInfo('Hot-reload server stopped')
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logInfo('Shutting down hot-reload server...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logInfo('Shutting down hot-reload server...')
  process.exit(0)
})

// Start the hot-reload server
const reloader = new HotReloader()
reloader.start().catch(error => {
  logError(`Failed to start hot-reload server: ${error.message}`)
  process.exit(1)
})
