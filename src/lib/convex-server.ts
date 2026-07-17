/**
 * Server-side Convex HTTP API helper.
 * Dipakai di Server Components dan API routes.
 *
 * Untuk client components, gunakan hooks dari `@/hooks/use-convex.ts` (ConvexProvider).
 */

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const CONVEX_SITE_URL = CONVEX_URL.replace('.cloud', '.site');

export type ConvexCacheOptions = {
  /** Time in seconds the response is considered fresh. Omit to never cache. */
  revalidate?: number;
  /** Next.js cache tags for on-demand invalidation via revalidateTag(). */
  tags?: string[];
};

export async function convexQuery<T = unknown>(
  path: string,
  args: unknown,
  options: ConvexCacheOptions = {}
): Promise<T> {
  const res = await fetch(`${CONVEX_SITE_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' }),
    cache: options.revalidate !== undefined ? undefined : 'no-store',
    next:
      options.revalidate !== undefined
        ? { revalidate: options.revalidate, tags: options.tags }
        : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex query ${path} failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.value as T;
}

export async function convexMutation<T = unknown>(
  path: string,
  args: unknown
): Promise<T> {
  const res = await fetch(`${CONVEX_SITE_URL}/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex mutation ${path} failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.value as T;
}
