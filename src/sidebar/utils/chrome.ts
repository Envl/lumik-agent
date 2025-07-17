// Chrome extension communication utilities

export interface BackgroundMessage {
  action: string
  command?: string
  timestamp?: number
  [key: string]: any
}

export interface BackgroundResponse {
  success: boolean
  error?: string
  [key: string]: any
}

export async function sendToBackground(message: BackgroundMessage): Promise<BackgroundResponse> {
  try {
    return await chrome.runtime.sendMessage(message)
  } catch (error) {
    console.error('Error sending message to background:', error)
    throw error
  }
}

export async function executeCommand(command: string): Promise<BackgroundResponse> {
  return await sendToBackground({
    action: 'executeCommand',
    command,
    timestamp: Date.now()
  })
}

export function setupBackgroundListener(callback: (message: any) => void): void {
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(callback)
  }
}

export function removeBackgroundListener(callback: (message: any) => void): void {
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.removeListener(callback)
  }
}
