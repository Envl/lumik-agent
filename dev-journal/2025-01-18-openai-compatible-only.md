# OpenAI Compatible API Only Support

## Date: 2025-01-18

## Task
Simplify the LLM service to only support OpenAI-compatible APIs. This provides better flexibility as many providers (including self-hosted models) now implement the OpenAI API standard.

## Changes Made

### 1. Removed Claude-specific Implementation
- Removed `claude` provider type
- Removed `makeClaudeRequest` method
- Simplified provider type to focus on OpenAI compatibility

### 2. Updated Configuration
- Simplified `LLMProvider` type
- Updated default configurations to remove Claude
- Kept flexible API URL configuration for different OpenAI-compatible providers

### 3. Benefits
- Simpler codebase with single API implementation
- Better support for various providers (OpenAI, Azure OpenAI, local models, etc.)
- Easier maintenance and testing
- More consistent API behavior

## Supported Providers
With OpenAI-compatible API, users can now use:
- OpenAI official API
- Azure OpenAI Service
- Local models via OpenAI-compatible servers (ollama, vLLM, etc.)
- Alternative providers with OpenAI-compatible endpoints

## Technical Details
- Single request method for all providers
- Configurable API URLs for different endpoints
- Maintains backward compatibility with existing OpenAI configurations
