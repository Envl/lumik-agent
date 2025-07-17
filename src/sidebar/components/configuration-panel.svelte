<script lang="ts">
    import { onMount } from 'svelte'
    import { llm_list } from '../llm'
    import { type LLMConfig, type LLMProvider, llmService } from '../services/llm-service'
    import {
        is_llm_configured,
        llm_config,
        load_llm_config,
        save_llm_config,
        selected_provider,
        setStatus
    } from '../stores/app-store'

    let showConfig = $state(false)
    let isSaving = $state(false)
    let formConfig = $state<LLMConfig>({
        provider: 'openai',
        apiKey: '',
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 1000
    })

    onMount(async () => {
        await load_llm_config()
        // If we have a saved config, use it as the form default
        if ($llm_config) {
            formConfig = { ...$llm_config }
        }
    })

    async function saveConfig() {
        if (!formConfig.apiKey.trim()) {
            setStatus('error', 'API key is required')
            return
        }

        isSaving = true
        try {
            await save_llm_config(formConfig)
            await llmService.loadConfig()
            showConfig = false
            setStatus('ready', 'Configuration saved successfully')
        } catch (error) {
            console.error('Error saving config:', error)
            setStatus('error', 'Failed to save configuration')
        } finally {
            isSaving = false
        }
    }

    function openConfig() {
        // Reset form to current config or defaults when opening
        if ($llm_config) {
            formConfig = { ...$llm_config }
        } else {
            formConfig = {
                provider: 'openai',
                apiKey: '',
                apiUrl: 'https://api.openai.com/v1',
                model: 'gpt-4o-mini',
                temperature: 0.1,
                maxTokens: 1000
            }
        }
        showConfig = true
    }

    function closeConfig() {
        showConfig = false
    }

    function handleProviderChange(provider: LLMProvider) {
        formConfig.provider = provider
        selected_provider.set(provider)
    }

    function handleConfigChange(field: keyof LLMConfig, value: string | number) {
        formConfig = {
            ...formConfig,
            [field]: value
        }
    }
</script>

<div class="border-b border-gray-200 bg-white px-4 py-3">
    <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
            <div
                class="h-2 w-2 rounded-full {$is_llm_configured ? 'bg-green-500' : 'bg-red-500'}"
            ></div>
            <span class="text-sm font-medium text-gray-700">
                {$is_llm_configured ? 'LLM Configured' : 'LLM Not Configured'}
            </span>
        </div>

        <button
            onclick={openConfig}
            class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
        >
            {$is_llm_configured ? 'Settings' : 'Configure'}
        </button>
    </div>

    {#if $is_llm_configured && $llm_config}
        <div class="mt-2 text-xs text-gray-500">
            Model: {$llm_config.model}
        </div>
    {/if}
</div>

{#if showConfig}
    <div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
        <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
            <div class="p-6">
                <div class="mb-6 flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-gray-900">LLM Configuration</h2>
                    <button
                        onclick={closeConfig}
                        aria-label="Close configuration dialog"
                        class="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div class="space-y-6">
                    <!-- Provider Selection -->
                    <div>
                        <div class="mb-2 block text-sm font-medium text-gray-700">Provider</div>
                        <div class="grid grid-cols-1 gap-2">
                            <button
                                onclick={() => handleProviderChange('openai')}
                                class="rounded-lg border-2 border-blue-500 bg-blue-50 p-3 text-sm font-medium text-blue-700 transition-colors"
                            >
                                OpenAI Compatible
                            </button>
                            <p class="mt-1 text-xs text-gray-500">
                                Supports OpenAI API, Azure OpenAI, and other compatible providers
                            </p>
                        </div>
                    </div>

                    <!-- API Key -->
                    <div>
                        <label
                            for="api-key-input"
                            class="mb-2 block text-sm font-medium text-gray-700">API Key</label
                        >
                        <input
                            id="api-key-input"
                            type="password"
                            value={formConfig.apiKey}
                            oninput={(e) =>
                                handleConfigChange('apiKey', (e.target as HTMLInputElement).value)}
                            placeholder="Enter your API key"
                            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <p class="mt-1 text-xs text-gray-500">
                            Get your key from https://platform.openai.com/api-keys
                        </p>
                    </div>

                    <!-- Model -->
                    <div>
                        <label
                            for="model-select"
                            class="mb-2 block text-sm font-medium text-gray-700">Model</label
                        >
                        <select
                            id="model-select"
                            value={formConfig.model}
                            onchange={(e) =>
                                handleConfigChange('model', (e.target as HTMLSelectElement).value)}
                            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            {#each llm_list as model (model.id)}
                                <option value={model.id}>{model.name}</option>
                            {/each}
                        </select>
                    </div>

                    <!-- API URL -->
                    <div>
                        <label
                            for="api-url-input"
                            class="mb-2 block text-sm font-medium text-gray-700">API URL</label
                        >
                        <input
                            id="api-url-input"
                            type="url"
                            value={formConfig.apiUrl || ''}
                            oninput={(e) =>
                                handleConfigChange('apiUrl', (e.target as HTMLInputElement).value)}
                            placeholder="https://api.openai.com/v1"
                            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <p class="mt-1 text-xs text-gray-500">
                            Leave blank to use default. Use custom URLs for local models or
                            alternative providers.
                        </p>
                    </div>

                    <!-- Advanced Settings -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label
                                for="temperature-input"
                                class="mb-2 block text-sm font-medium text-gray-700"
                                >Temperature</label
                            >
                            <input
                                id="temperature-input"
                                type="number"
                                min="0"
                                max="2"
                                step="0.1"
                                value={formConfig.temperature}
                                oninput={(e) =>
                                    handleConfigChange(
                                        'temperature',
                                        parseFloat((e.target as HTMLInputElement).value)
                                    )}
                                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label
                                for="tokens-input"
                                class="mb-2 block text-sm font-medium text-gray-700"
                                >Max Tokens</label
                            >
                            <input
                                id="tokens-input"
                                type="number"
                                min="100"
                                max="4000"
                                step="100"
                                value={formConfig.maxTokens}
                                oninput={(e) =>
                                    handleConfigChange(
                                        'maxTokens',
                                        parseInt((e.target as HTMLInputElement).value)
                                    )}
                                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <!-- Save Button -->
                    <div class="flex justify-end space-x-3">
                        <button
                            onclick={closeConfig}
                            class="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:outline-none"
                        >
                            Cancel
                        </button>
                        <button
                            onclick={saveConfig}
                            disabled={isSaving}
                            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style lang="postcss">
</style>
