import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { AiError } from '@/lib/ai/types';
import { normalizeOpenAiCompatibleBaseUrl } from '@/lib/ai/providers/openai-compatible';
import { allowedPrivateHosts } from '@/lib/ai/providers/openai-compatible';
import { isDeliverableUrl } from '@/lib/webhooks/ssrf';
import { getT } from '@/lib/i18n/translate';

const t = getT('Api');
const tErr = getT('LibErrors');

interface ModelsResponse {
  data?: Array<{ id?: string; model?: string }>;
}

/**
 * POST /api/ai/models  (admin+)
 *
 * Queries an OpenAI-compatible provider's `/models` endpoint and returns
 * the list of available model IDs so the UI can offer a dropdown selection.
 * Works with any OpenAI-compatible API (Ollama, Groq, Together, vLLM, etc.).
 */
export async function POST(request: Request) {
  try {
    const { userId } = await requireRole('admin');

    const limit = checkRateLimit(
      `ai-models:${userId}`,
      RATE_LIMITS.adminAction
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => ({}));
    const rawBaseUrl =
      typeof body?.base_url === 'string' && body.base_url.trim()
        ? body.base_url.trim()
        : '';
    const apiKey =
      typeof body?.api_key === 'string' && body.api_key.trim()
        ? body.api_key.trim()
        : '';

    if (!rawBaseUrl) {
      return NextResponse.json(
        { error: t('ai.compatBaseUrlRequired'), code: 'invalid_base_url' },
        { status: 400 }
      );
    }

    let modelsUrl: string;
    try {
      // Normalize the base URL (ensures /chat/completions suffix)
      const completionsUrl = normalizeOpenAiCompatibleBaseUrl(rawBaseUrl);
      const parsed = new URL(completionsUrl);
      // Replace /chat/completions with /models
      parsed.pathname = '/models';
      modelsUrl = parsed.toString();
    } catch (err) {
      return NextResponse.json(
        {
          error: err instanceof AiError ? err.message : t('ai.baseUrlInvalid'),
          code: 'invalid_base_url',
        },
        { status: 400 }
      );
    }

    const deliverable = await isDeliverableUrl(modelsUrl, {
      allowPrivateHosts: allowedPrivateHosts(),
    }).catch(() => false);

    if (!deliverable) {
      return NextResponse.json(
        {
          error: tErr('ai.compatBlockedUrl', {
            envVar: 'AI_PROVIDER_ALLOWED_PRIVATE_HOSTS',
          }),
          code: 'blocked_url',
        },
        { status: 400 }
      );
    }

    let res: Response;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      res = await fetch(modelsUrl, {
        method: 'GET',
        redirect: 'manual',
        headers,
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      return NextResponse.json(
        { error: t('ai.validateFailed'), code: 'network_error' },
        { status: 400 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: t('ai.validateFailed'), code: 'provider_error' },
        { status: 400 }
      );
    }

    const data = (await res
      .json()
      .catch(() => null)) as ModelsResponse | null;
    const models = Array.from(
      new Set(
        (data?.data ?? [])
          .map((m) =>
            typeof m?.id === 'string'
              ? m.id.trim()
              : typeof m?.model === 'string'
                ? m.model.trim()
                : ''
          )
          .filter(Boolean)
      )
    );

    return NextResponse.json({ models });
  } catch (err) {
    return toErrorResponse(err);
  }
}