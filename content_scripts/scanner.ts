// Enhanced Vision System for Lumik Agent
// This script scans the current page and identifies all interactable elements

import { html2markdown } from '@/sidebar/utils/html2markdown'

interface ElementInfo {
    elementId: string
    tagName: string
    type?: string
    text: string
    value?: string
    href?: string
    role?: string
    ariaLabel?: string
    placeholder?: string
    className: string
    id: string
    position: {
        x: number
        y: number
        width: number
        height: number
    }
    isVisible: boolean
    isEnabled: boolean
}

interface ScanResult {
    success: boolean
    data?: {
        url: string
        title: string
        pageMarkdown: string
        elements: ElementInfo[]
        totalElements: number
        pageHeight: number
        pageWidth: number
        scrollPosition: { x: number; y: number }
    }
    error?: string
}

interface MessageRequest {
    action: string
    [key: string]: any
}

interface MessageResponse {
    success: boolean
    data?: any
    error?: string
}

;(function () {
    'use strict'

    // Use a global counter on the window object to ensure uniqueness across multiple runs
    if (typeof (window as any).llm_page_scanner_element_index === 'undefined') {
        ;(window as any).llm_page_scanner_element_index = 0
    }

    // Main function to get all interactable elements
    function getInteractableElements(): { pageMarkdown: string; elements: ElementInfo[] } {
        const elements: ElementInfo[] = []

        // Comprehensive selectors for interactable elements
        const selectors = [
            'button',
            'input',
            'textarea',
            // contenteditable true
            '[contenteditable="true"]',
            'select',
            'a[href]',
            '[role="button"]',
            '[role="link"]',
            '[role="textbox"]',
            '[role="tab"]',
            '[role="menuitem"]',
            '[contenteditable="true"]',
            '[contenteditable=""]',
            '[tabindex="0"]',
            '[tabindex="-1"]',
            '[onclick]',
            '.clickable',
            '.btn',
            '.button'
        ]

        // Find all potentially interactable elements
        const foundElements = document.querySelectorAll(selectors.join(','))

        foundElements.forEach((el: Element) => {
            // Skip if element is hidden or has no dimensions
            const rect = el.getBoundingClientRect()
            const computedStyle = window.getComputedStyle(el)

            if (
                ((rect.width === 0 || rect.height === 0) && el.getClientRects().length === 0) ||
                computedStyle.display === 'none' ||
                computedStyle.visibility === 'hidden' ||
                computedStyle.opacity === '0'
            ) {
                return
            }

            // Check if a child element is already interactable
            if (el.querySelector('[data-llm-id]')) {
                return
            }

            // Check if element is actually interactable
            const isDisabled =
                (el as HTMLInputElement).disabled ||
                (el as HTMLButtonElement).disabled ||
                el.getAttribute('aria-disabled') === 'true'

            if (isDisabled) {
                return
            }

            // Generate unique ID for this element if it does not have one
            let elementId = el.getAttribute('data-llm-id')
            if (!elementId) {
                const uniqueId = (window as any).llm_page_scanner_element_index++
                const randomStr = Math.random().toString(36).substring(2, 8)
                elementId = `llm-${uniqueId}-${randomStr}`
                el.setAttribute('data-llm-id', elementId)
            }

            // Extract element information
            const elementInfo: ElementInfo = {
                elementId,
                tagName: el.tagName.toLowerCase(),
                type: (el as HTMLInputElement).type || undefined,
                text: getElementText(el),
                value: (el as HTMLInputElement).value || undefined,
                href: (el as HTMLAnchorElement).href || undefined,
                role: el.getAttribute('role') || undefined,
                ariaLabel: el.getAttribute('aria-label') || undefined,
                placeholder: (el as HTMLInputElement).placeholder || undefined,
                className: el.className,
                id: el.id,
                position: {
                    x: Math.round(rect.left),
                    y: Math.round(rect.top),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                },
                isVisible: true,
                isEnabled: !isDisabled
            }

            elements.push(elementInfo)
        })

        return {
            elements,
            pageMarkdown: html2markdown(document.body.innerHTML)
        }
    }

    // Get meaningful text from element
    function getElementText(element: Element): string {
        // For inputs, use placeholder or label
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            const input = element as HTMLInputElement
            return input.placeholder || input.getAttribute('aria-label') || input.value || ''
        }

        // For buttons, use text content
        if (element.tagName === 'BUTTON') {
            return element.textContent?.trim() || ''
        }

        // For links, use text content or href
        if (element.tagName === 'A') {
            const link = element as HTMLAnchorElement
            return (
                element.getAttribute('aria-label') || element.textContent?.trim() || link.href || ''
            )
        }

        // For select elements, use selected option text
        if (element.tagName === 'SELECT') {
            const select = element as HTMLSelectElement
            return select.selectedOptions[0]?.textContent?.trim() || ''
        }

        // For other elements, use text content
        let text = element.textContent?.trim() || ''

        // Truncate very long text
        if (text.length > 100) {
            text = text.substring(0, 100) + '...'
        }

        return text
    }

    // Get current page information
    function getPageInfo(): ScanResult['data'] {
        const { elements, pageMarkdown } = getInteractableElements()

        return {
            url: window.location.href,
            title: document.title,
            pageMarkdown,
            elements,
            totalElements: elements.length,
            pageHeight: Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
            ),
            pageWidth: Math.max(
                document.body.scrollWidth,
                document.body.offsetWidth,
                document.documentElement.clientWidth,
                document.documentElement.scrollWidth,
                document.documentElement.offsetWidth
            ),
            scrollPosition: {
                x: window.scrollX || window.pageXOffset,
                y: window.scrollY || window.pageYOffset
            }
        }
    }

    // Highlight an element for debugging
    function highlightElement(elementId: string): MessageResponse {
        const element = document.querySelector(`[data-llm-id="${elementId}"]`)
        if (!element) {
            return { success: false, error: 'Element not found' }
        }

        // Add highlight style
        const originalStyle = (element as HTMLElement).style.cssText
        ;(element as HTMLElement).style.cssText += `
      outline: 3px solid #ff6b6b !important;
      outline-offset: 2px !important;
      background-color: rgba(255, 107, 107, 0.1) !important;
    `

        // Remove highlight after 3 seconds
        setTimeout(() => {
            ;(element as HTMLElement).style.cssText = originalStyle
        }, 3000)

        return { success: true }
    }

    // Simulate a click on an element
    function simulateClick(elementId: string): MessageResponse {
        const element = document.querySelector(`[data-llm-id="${elementId}"]`)
        if (!element) {
            return { success: false, error: 'Element not found' }
        }

        try {
            // First try a real click
            ;(element as HTMLElement).click()

            // If that doesn't work, try dispatching events
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            })
            element.dispatchEvent(clickEvent)

            return { success: true }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    }

    // Type text into an input element
    function typeText(elementId: string, text: string): MessageResponse {
        const element = document.querySelector(`[data-llm-id="${elementId}"]`) as HTMLInputElement
        if (!element) {
            return { success: false, error: 'Element not found' }
        }

        if (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA') {
            return { success: false, error: 'Element is not an input field' }
        }

        try {
            // Focus the element
            element.focus()

            // Clear existing content
            element.value = ''

            // Type the text
            element.value = text

            // Trigger input events
            const inputEvent = new Event('input', { bubbles: true })
            element.dispatchEvent(inputEvent)

            const changeEvent = new Event('change', { bubbles: true })
            element.dispatchEvent(changeEvent)

            return { success: true }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    }

    // Clear text from an input element
    function clearText(elementId: string): MessageResponse {
        const element = document.querySelector(`[data-llm-id="${elementId}"]`) as HTMLInputElement
        if (!element) {
            return { success: false, error: 'Element not found' }
        }

        if (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA') {
            return { success: false, error: 'Element is not an input field' }
        }

        try {
            element.focus()
            element.value = ''

            const inputEvent = new Event('input', { bubbles: true })
            element.dispatchEvent(inputEvent)

            const changeEvent = new Event('change', { bubbles: true })
            element.dispatchEvent(changeEvent)

            return { success: true }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    }

    // Select an option from a dropdown
    function selectOption(elementId: string, optionText: string): MessageResponse {
        const element = document.querySelector(`[data-llm-id="${elementId}"]`) as HTMLSelectElement
        if (!element) {
            return { success: false, error: 'Element not found' }
        }

        if (element.tagName !== 'SELECT') {
            return { success: false, error: 'Element is not a select dropdown' }
        }

        try {
            // Find option by text content
            const options = Array.from(element.options)
            const targetOption = options.find((opt) =>
                opt.textContent?.toLowerCase().includes(optionText.toLowerCase())
            )

            if (!targetOption) {
                return { success: false, error: `Option "${optionText}" not found` }
            }

            element.value = targetOption.value

            const changeEvent = new Event('change', { bubbles: true })
            element.dispatchEvent(changeEvent)

            return { success: true }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    }

    // Scroll the page
    function scrollPage(direction: string): MessageResponse {
        try {
            const scrollAmount = window.innerHeight * 0.8

            switch (direction.toLowerCase()) {
                case 'up':
                    window.scrollBy(0, -scrollAmount)
                    break
                case 'down':
                    window.scrollBy(0, scrollAmount)
                    break
                case 'top':
                    window.scrollTo(0, 0)
                    break
                case 'bottom':
                    window.scrollTo(0, document.body.scrollHeight)
                    break
                default:
                    return {
                        success: false,
                        error: 'Invalid direction. Use: up, down, top, bottom'
                    }
            }

            return { success: true }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    }

    // Message handler for background script communication
    chrome.runtime.onMessage.addListener(
        (
            request: MessageRequest,
            _sender: chrome.runtime.MessageSender,
            sendResponse: (response: MessageResponse) => void
        ) => {
            try {
                switch (request.action) {
                    case 'ping':
                        sendResponse({ success: true })
                        break

                    case 'scanPage':
                        const pageInfo = getPageInfo()
                        sendResponse({ success: true, data: pageInfo })
                        break

                    case 'highlightElement':
                        const highlightResult = highlightElement(request.elementId)
                        sendResponse(highlightResult)
                        break

                    case 'simulateClick':
                        const clickResult = simulateClick(request.elementId)
                        sendResponse(clickResult)
                        break

                    case 'typeText':
                        const typeResult = typeText(request.elementId, request.text)
                        sendResponse(typeResult)
                        break

                    case 'clearText':
                        const clearResult = clearText(request.elementId)
                        sendResponse(clearResult)
                        break

                    case 'selectOption':
                        const selectResult = selectOption(request.elementId, request.optionText)
                        sendResponse(selectResult)
                        break

                    case 'scrollPage':
                        const scrollResult = scrollPage(request.direction)
                        sendResponse(scrollResult)
                        break

                    default:
                        sendResponse({ success: false, error: 'Unknown action' })
                }
            } catch (error) {
                sendResponse({ success: false, error: (error as Error).message })
            }

            return true // Keep message channel open for async response
        }
    )

    // Auto-scan on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('AI Agent content script loaded')
        })
    } else {
        console.log('AI Agent content script loaded')
    }
})()
