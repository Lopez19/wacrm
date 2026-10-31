import { normalizeOpenAiCompatibleBaseUrl } from './providers/openai-compatible'

export const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434/v1'
export const DEFAULT_OLLAMA_MODEL = 'llama3.2:1b'
export const OLLAMA_PLACEHOLDER_API_KEY = 'ollama'

/**
 * Heuristic used by the UI to select the "Ollama (Local / Docker)"
 * provider option when loading an existing `openai_compatible` row.
 */
export function isOllamaBaseUrl(baseUrl: string | null | undefined): boolean {
  if (!baseUrl) return false
  try {
    const parsed = new URL(baseUrl.trim())
    const host = parsed.hostname.toLowerCase()
    const port = parsed.port
    if (port === '11434') return true
    if (host === 'ollama' || host.startsWith('ollama.') || host.endsWith('.ollama')) {
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Resolves an OpenAI-compatible Ollama base URL (e.g.
 * `http://127.0.0.1:11434/v1`) into Ollama's native `/api/tags` endpoint
 * while enforcing the same URL validation rules as chat completions.
 */
export function resolveOllamaTagsUrl(baseUrl: string): string {
  const completionsUrl = normalizeOpenAiCompatibleBaseUrl(baseUrl)
  const parsed = new URL(completionsUrl)
  parsed.pathname = '/api/tags'
  return parsed.toString()
}
