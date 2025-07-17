# API URL Configuration Support

## Date: 2025-01-18

## Task
Add support for configuring API URLs in the LLM service to allow users to:
- Use custom endpoints for OpenAI and Claude
- Connect to self-hosted models
- Use alternative API providers with compatible interfaces

## Changes Made

### 1. Updated LLMConfig Interface
- Added `apiUrl` field to allow custom API endpoints
- Made field optional with sensible defaults

### 2. Modified LLM Service
- Updated default configurations to include default API URLs
- Modified request methods to use configured API URLs instead of hardcoded ones
- Ensured backward compatibility with existing configurations

### 3. Benefits
- Flexibility to use different API endpoints
- Support for self-hosted models
- Better compatibility with alternative providers
- Maintains backward compatibility

## Technical Details
- OpenAI default: `https://api.openai.com/v1`
- Claude default: `https://api.anthropic.com/v1`
- Configuration stored in Chrome storage alongside other settings
