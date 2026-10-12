const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Chrome match pattern for a provider's base URL, or null if the URL is not
 * allowed. Remote providers must use HTTPS; plain HTTP is only allowed for
 * local servers (Ollama, LM Studio).
 */
export function originPattern(baseUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return null;
  }
  if (url.protocol === 'https:' && url.hostname) return `https://${url.hostname}/*`;
  if (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) return `http://${url.hostname}/*`;
  return null;
}

/**
 * Ask Chrome for access to the provider's host. MUST be called directly from a
 * user gesture (click handler) before any other await, or Chrome rejects it.
 */
export function requestHostAccess(baseUrl: string): Promise<boolean> {
  const pattern = originPattern(baseUrl);
  if (!pattern) return Promise.resolve(false);
  return browser.permissions.request({ origins: [pattern] });
}

export async function hasHostAccess(baseUrl: string): Promise<boolean> {
  const pattern = originPattern(baseUrl);
  if (!pattern) return false;
  return browser.permissions.contains({ origins: [pattern] });
}
