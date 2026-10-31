import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { AiError } from '@/lib/ai/types';
import { DEFAULT_OLLAMA_BASE_URL, resolveOllamaTagsUrl } from '@/lib/ai/ollama';
import { allowedPrivateHosts } from '@/lib/ai/providers/openai-compatible';
import { isDeliverableUrl } from '@/lib/webhooks/ssrf';
import { getT } from '@/lib/i18n/translate';

const t = getT('Api');
const tErr = getT('LibErrors');

interface OllamaTagsResponse {
  models?: Array<{ name?: string; model?: string }>;
}

/**
 * POST /api/ai/ollama/models  (admin+)
 *
 * Queries the configured Ollama instance's `/api/tags` endpoint and returns
 * the list of locally installed model names so the UI can offer 1-click
 * selection or inform the user when no models have been pulled yet.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await requireRole('admin');

    const limit = checkRateLimit(
      `ai-ollama-models:${userId}`,
      RATE_LIMITS.adminAction
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => ({}));
    const rawBaseUrl =
      typeof body?.base_url === 'string' && body.base_url.trim()
        ? body.base_url.trim()
        : DEFAULT_OLLAMA_BASE_URL;

    let tagsUrl: string;
    try {
      tagsUrl = resolveOllamaTagsUrl(rawBaseUrl);
    } catch (err) {
      return NextResponse.json(
        {
          error: err instanceof AiError ? err.message : t('ai.baseUrlInvalid'),
          code: 'invalid_base_url',
        },
        { status: 400 }
      );
    }

    const deliverable = await isDeliverableUrl(tagsUrl, {
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
      res = await fetch(tagsUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
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
      .catch(() => null)) as OllamaTagsResponse | null;
    const models = Array.from(
      new Set(
        (data?.models ?? [])
          .map((m) =>
            typeof m?.name === 'string'
              ? m.name.trim()
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
