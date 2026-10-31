import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OLLAMA_BASE_URL,
  isOllamaBaseUrl,
  resolveOllamaTagsUrl,
} from './ollama'

describe('isOllamaBaseUrl', () => {
  it('recognises standard Ollama ports and hostnames', () => {
    expect(isOllamaBaseUrl(DEFAULT_OLLAMA_BASE_URL)).toBe(true)
    expect(isOllamaBaseUrl('http://localhost:11434/v1')).toBe(true)
    expect(isOllamaBaseUrl('http://host.docker.internal:11434/v1')).toBe(true)
    expect(isOllamaBaseUrl('http://ollama:8080/v1')).toBe(true)
    expect(isOllamaBaseUrl('http://ollama.internal/v1')).toBe(true)
  })

  it('returns false for non-Ollama URLs', () => {
    expect(isOllamaBaseUrl('https://api.groq.com/openai/v1')).toBe(false)
    expect(isOllamaBaseUrl('https://api.openai.com/v1')).toBe(false)
    expect(isOllamaBaseUrl(null)).toBe(false)
    expect(isOllamaBaseUrl('')).toBe(false)
  })
})

describe('resolveOllamaTagsUrl', () => {
  it('maps an allowed local Ollama base URL to /api/tags', () => {
    const previous = process.env.AI_PROVIDER_ALLOWED_PRIVATE_HOSTS
    process.env.AI_PROVIDER_ALLOWED_PRIVATE_HOSTS = '127.0.0.1,localhost'
    try {
      expect(resolveOllamaTagsUrl('http://127.0.0.1:11434/v1')).toBe(
        'http://127.0.0.1:11434/api/tags',
      )
      expect(resolveOllamaTagsUrl('http://localhost:11434/v1/chat/completions')).toBe(
        'http://localhost:11434/api/tags',
      )
    } finally {
      if (previous === undefined) delete process.env.AI_PROVIDER_ALLOWED_PRIVATE_HOSTS
      else process.env.AI_PROVIDER_ALLOWED_PRIVATE_HOSTS = previous
    }
  })
})
