export const DEFAULT_APP_NAME = "Eenza CRM";

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || DEFAULT_APP_NAME;

/**
 * Replaces occurrences of DEFAULT_APP_NAME across a loaded message
 * catalogue when NEXT_PUBLIC_APP_NAME overrides the default brand name.
 */
export function applyBrandName<T>(node: T, brandName: string = APP_NAME): T {
  const normalized = brandName.trim() || DEFAULT_APP_NAME;
  if (normalized === DEFAULT_APP_NAME) return node;
  if (typeof node === "string") {
    return node.replaceAll(DEFAULT_APP_NAME, normalized) as unknown as T;
  }
  if (Array.isArray(node)) {
    return node.map((item) => applyBrandName(item, normalized)) as unknown as T;
  }
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = applyBrandName(v, normalized);
    }
    return out as T;
  }
  return node;
}
