/**
 * Client-side real-IP detection.
 *
 * Problem: When the browser calls the backend through Docker's port-mapping,
 * Docker NAT replaces the real client IP with the bridge gateway IP (e.g.
 * 172.29.0.1). The backend then always falls back to TN pricing.
 *
 * Fix: Detect the browser's real public IP using ipify.org (free, no auth,
 * CORS-enabled) and forward it as X-Forwarded-For in payment requests.
 *
 * In production behind nginx/ALB, nginx overwrites X-Forwarded-For with
 * $remote_addr before the request reaches the API, so there is no spoofing
 * risk in production.
 */

let cachedIp: string | null = null;
let cacheExpiry = 0;

/**
 * Returns the browser's real public IP address.
 * Cached for 5 minutes. Returns null on any error (graceful degradation).
 */
export async function getRealPublicIp(): Promise<string | null> {
  if (typeof window === 'undefined') return null; // SSR guard
  if (cachedIp && Date.now() < cacheExpiry) return cachedIp;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data: { ip: string } = await res.json();

    if (!data.ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(data.ip)) return null;

    cachedIp = data.ip;
    cacheExpiry = Date.now() + 1000 * 60; // 1 min — short enough for VPN testing
    return cachedIp;
  } catch {
    return null;
  }
}

/** Clear the cached IP (e.g. when VPN is toggled) */
export function clearIpCache(): void {
  cachedIp = null;
  cacheExpiry = 0;
}
