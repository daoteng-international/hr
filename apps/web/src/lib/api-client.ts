/**
 * Thin fetch wrapper for talking to the @hr/api service.
 *
 * Base URL comes from NEXT_PUBLIC_API_URL (defaults to local dev API).
 * Automatically attaches an Authorization: Bearer token when one is available.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Resolve the auth token to send with requests.
 *
 * TODO(P1): wire to the real auth/tenant session once login lands. For now
 * there is no session, so this returns null and requests go out unauthenticated.
 */
function getAuthToken(): string | null {
  return null;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const authToken = token ?? getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...((fetchOptions.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: res.statusText }));
    throw new Error(`[${res.status}] ${error.message ?? error.error ?? res.statusText}`);
  }

  return res.json() as Promise<T>;
}
