/**
 * Default max timeout (ms) for browser → Nest → Python agent calls.
 * Matches AWS Application Load Balancer maximum idle timeout (4000 seconds).
 * @see https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
 */
export const DEFAULT_AGENT_API_TIMEOUT_MS = 4_000_000;

export function getAgentApiTimeoutMs(): number {
  const raw =
    typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_AGENT_API_TIMEOUT_MS : undefined;
  const parsed = parseInt(String(raw ?? DEFAULT_AGENT_API_TIMEOUT_MS), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AGENT_API_TIMEOUT_MS;
}
