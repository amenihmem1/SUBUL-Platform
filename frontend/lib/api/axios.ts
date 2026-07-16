/**
 * Axios instance for NestJS API (backend).
 * Base URL: NEXT_PUBLIC_BACKEND_URL, otherwise same-origin /api rewrites.
 * Attaches JWT from lib/auth/token to requests.
 */
import axios, { type AxiosInstance } from 'axios';
import { DEFAULT_AGENT_API_TIMEOUT_MS } from '@/lib/agent-timeout';
import { getToken } from '@/lib/auth/token';

const DEFAULT_PRODUCTION_BACKEND_URL = 'https://subul-api.bravesand-e5d986f3.francecentral.azurecontainerapps.io';

/** Strip trailing /api to avoid duplicate prefix (API_PATHS already include /api) */
function normalizeBackendUrl(url: string): string {
  return url.replace(/\/$/, '').replace(/\/api\/?$/, '');
}

 const baseURL =
   typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BACKEND_URL
     ? normalizeBackendUrl(process.env.NEXT_PUBLIC_BACKEND_URL)
    : '';

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const parsedAgentTimeout = parseInt(
  typeof process !== 'undefined'
    ? process.env?.NEXT_PUBLIC_AGENT_API_TIMEOUT_MS || String(DEFAULT_AGENT_API_TIMEOUT_MS)
    : String(DEFAULT_AGENT_API_TIMEOUT_MS),
  10,
);
const AGENT_API_TIMEOUT_MS =
  Number.isFinite(parsedAgentTimeout) && parsedAgentTimeout > 0
    ? parsedAgentTimeout
    : DEFAULT_AGENT_API_TIMEOUT_MS;

/** Nest routes that proxy to Python agents (must stay >= backend AGENT_HTTP_TIMEOUT_MS). */
function isAgentProxiedPath(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split('?')[0];
  const prefixes = [
    '/api/cv/',
    '/api/job-search',
    '/api/coach/',
    '/api/cloud-tutor/',
    '/api/roadmap/',
    '/api/quiz/',
  ];
  return prefixes.some((p) => path === p || path.startsWith(p));
}

const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 second default; agent routes bumped in interceptor
});

let isAutoLogoutInFlight = false;

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData must use multipart/form-data with boundary; do not force application/json
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  if (isAgentProxiedPath(config.url)) {
    const current = typeof config.timeout === 'number' ? config.timeout : 0;
    config.timeout = Math.max(current, AGENT_API_TIMEOUT_MS);
  }
  return config;
});

function getRetryCount(config: any): number {
  return typeof config?.__retryCount === 'number' ? config.__retryCount : 0;
}

function setRetryCount(config: any, n: number) {
  config.__retryCount = n;
}

function isRetryableStatus(status: number | undefined): boolean {
  return status === 502 || status === 503 || status === 504;
}

function isSafeMethod(method: unknown): boolean {
  const m = String(method || 'get').toLowerCase();
  return m === 'get' || m === 'head';
}

function backoffMs(attempt: number): number {
  const base = Math.min(5000, 1000 * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}

// Add response interceptor for retry + error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const status: number | undefined = error?.response?.status;

    const url = String(config?.url || '');
    const isAuthEndpoint =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/verify-email') ||
      url.includes('/api/auth/resend-verification') ||
      url.includes('/api/auth/forgot-password') ||
      url.includes('/api/auth/forgot-password-email') ||
      url.includes('/api/auth/reset-password') ||
      url.includes('/api/auth/change-email');

    // Global 401 → force logout (and sync across tabs).
    // Guard against loops (multiple parallel 401s) and avoid affecting auth endpoints.
    if (
      status === 401 &&
      !isAuthEndpoint &&
      !isAutoLogoutInFlight &&
      typeof window !== 'undefined' &&
      !!getToken()
    ) {
      isAutoLogoutInFlight = true;
      try {
        window.dispatchEvent(
          new CustomEvent('auth:logout', { detail: { broadcast: true, callBackend: false } })
        );
      } catch {
        // ignore
      }
      return Promise.reject(error);
    }

    const maxRetries = 2;
    const retryCount = getRetryCount(config);
    if (
      config &&
      retryCount < maxRetries &&
      isSafeMethod(config.method) &&
      (isRetryableStatus(status) || error?.code === 'ERR_NETWORK' || !error?.response)
    ) {
      setRetryCount(config, retryCount + 1);
      await sleepMs(backoffMs(retryCount + 1));
      return api.request(config);
    }

    // Errors are handled by normalizeApiError at the call site.
    // Only log unexpected server errors here for debugging.
    if (error?.response?.status >= 500) {
      console.error(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${error.response.status}`);
    }
    return Promise.reject(error);
  }
);

export function getBackendUrl(): string {
  if (baseURL) return baseURL;
  return process.env.NODE_ENV === 'production' ? DEFAULT_PRODUCTION_BACKEND_URL : '';
}

export default api;
