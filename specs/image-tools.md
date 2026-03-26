# Feature: Image Tools

## Context
generate-image.ts routes to 3 AI image APIs (Replicate/Flux, OpenAI/GPT-image-1, Google/Gemini) with gallery management and metadata tracking. search-unsplash.ts searches stock photos with attribution. Both load API keys from .env.

## Scenarios

### generate-image.ts

### Scenario: Load API keys from .env
- **Given** a .env file with REPLICATE_API_TOKEN and OPENAI_API_KEY
- **When** environment is loaded
- **Then** both keys are available for model routing
- **Priority:** critical

### Scenario: Route to correct model
- **Given** model parameter "flux"
- **When** image generation is dispatched
- **Then** Replicate API is called (not OpenAI or Gemini)
- **Priority:** critical

### Scenario: Save generated image to gallery
- **Given** a successful image generation returning a URL
- **When** the result is processed
- **Then** image is downloaded to the project gallery directory
- **And** metadata JSON is written with prompt, model, timestamp
- **Priority:** critical

### Scenario: Handle API failure gracefully
- **Given** Replicate API returns 401 (bad token)
- **When** generation is attempted
- **Then** error message includes the API and status code
- **And** no file is written to gallery
- **Priority:** important

### search-unsplash.ts

### Scenario: Search returns photos with attribution
- **Given** a search query "mountain landscape" and valid UNSPLASH_ACCESS_KEY
- **When** Unsplash API is called
- **Then** results include photo URLs, photographer names, and Unsplash links
- **Priority:** critical

### Scenario: Download photo with attribution metadata
- **Given** a selected Unsplash photo
- **When** download is executed
- **Then** image file is saved to gallery
- **And** attribution JSON includes photographer, Unsplash URL, and license
- **Priority:** critical

### Scenario: Handle missing API key
- **Given** no UNSPLASH_ACCESS_KEY in environment
- **When** search is attempted
- **Then** error message says "UNSPLASH_ACCESS_KEY not set"
- **And** no API call is made
- **Priority:** important

## Out of Scope
- Testing actual API responses (mock all external calls)
- Image quality or content validation
- Rate limit handling for any API

## Acceptance Criteria
- [ ] .env parsing tested in isolation
- [ ] Model routing logic tested for each model type
- [ ] Gallery file I/O tested with temp directories
- [ ] Each API adapter tested with mocked fetch
- [ ] Attribution tracking tested for Unsplash
