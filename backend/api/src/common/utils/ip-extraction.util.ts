import { Request } from 'express';

/**
 * Returns true for loopback / RFC-1918 / Docker bridge / k8s pod IPs.
 * Public IPs (real browser IPs) return false.
 */
export function isPrivateOrLoopback(ip: string): boolean {
  const n = ip.replace('::ffff:', '').trim();
  if (!n || n === '::1' || n === 'localhost') return true;
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n)) return true;
  if (n.startsWith('fc') || n.startsWith('fd') || n.startsWith('fe80:')) return true;
  return false;
}

/**
 * Extract the real client IP — production-safe for AWS ALB + EKS.
 *
 * Priority (strict order, NEVER trust req.ip first in cloud environments):
 *  1. X-Forwarded-For — first PUBLIC IP (left-to-right scan).
 *     The leftmost entry is the original client IP; each proxy appends.
 *     We return the FIRST non-private IP to skip any internal hops.
 *  2. X-Real-IP — set by nginx / some ALB configurations.
 *  3. req.ip (Express trust-proxy computed) — LAST resort only.
 *     In AWS, req.ip can be the ALB VPC IP if trust proxy didn't fire correctly.
 *  4. socket.remoteAddress — always private in EKS (geo will fallback to EU).
 *
 * WHY x-forwarded-for FIRST:
 * - In AWS ALB → EKS, the ALB sets X-Forwarded-For with the real client IP.
 * - req.ip may resolve to the ALB's own IP (which might NOT be in private range
 *   if the ALB has a public IP), causing us to use the WRONG IP.
 * - The LEFTMOST entry in X-Forwarded-For is the original client IP set by
 *   the client's browser or the first trusted proxy.
 */
export function extractIp(req: Request): string {
  // ── 1. X-Forwarded-For — first PUBLIC IP (left → right) ──────────────────
  const xffHeader = req.headers['x-forwarded-for'];
  if (xffHeader) {
    const raw = Array.isArray(xffHeader) ? xffHeader.join(',') : xffHeader;
    const parts = raw.split(',');
    for (const seg of parts) {
      const ip = seg.trim().replace('::ffff:', '');
      if (ip && !isPrivateOrLoopback(ip)) {
        return ip;
      }
    }
  }

  // ── 2. X-Real-IP (nginx / some load-balancer configurations) ─────────────
  const realIp = ((req.headers['x-real-ip'] as string) ?? '').replace('::ffff:', '').trim();
  if (realIp && !isPrivateOrLoopback(realIp)) {
    return realIp;
  }

  // ── 3. Express-computed req.ip (trust proxy) — only if public ────────────
  const expressIp = (req.ip ?? '').replace('::ffff:', '').trim();
  if (expressIp && !isPrivateOrLoopback(expressIp)) {
    return expressIp;
  }

  // ── 4. Socket address — will be a private VPC IP in production ────────────
  return (req.socket?.remoteAddress ?? '127.0.0.1').replace('::ffff:', '');
}

/**
 * Debug snapshot of all IP-related headers and the extracted IP.
 * Useful for /api/geo/debug and /api/payments/detect-geo endpoints.
 */
export function extractIpDebug(req: Request): {
  extractedIp: string;
  headers: {
    socketRemoteAddress: string;
    expressReqIp: string;
    xForwardedFor: string | string[] | null;
    xRealIp: string | null;
  };
} {
  const socketIp = (req.socket?.remoteAddress ?? '').replace('::ffff:', '');
  const expressIp = (req.ip ?? '').replace('::ffff:', '');
  const xffRaw = req.headers['x-forwarded-for'] ?? null;
  const xRealIp = (req.headers['x-real-ip'] as string) ?? null;
  const extractedIp = extractIp(req);

  return {
    extractedIp,
    headers: {
      socketRemoteAddress: socketIp,
      expressReqIp: expressIp,
      xForwardedFor: xffRaw,
      xRealIp,
    },
  };
}
