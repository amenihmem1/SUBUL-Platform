import type { AxiosError } from 'axios';

export interface NormalizedError {
  /** Translation key in the `errors` namespace, e.g. "errors.invalidCredentials" */
  key: string;
  /** HTTP status if known */
  status?: number;
}

/** Maps backend `code` values → translation keys */
const BACKEND_CODE_MAP: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'errors.invalidCredentials',
  AUTH_EMAIL_ALREADY_EXISTS: 'errors.emailAlreadyExists',
  AUTH_EMAIL_ALREADY_VERIFIED: 'errors.emailAlreadyVerified',
  AUTH_INVALID_TOKEN: 'errors.invalidOrExpiredToken',
  AUTH_INVALID_INVITE: 'errors.invalidInvite',
  AUTH_FORBIDDEN_ROLE: 'errors.forbidden',
  UNAUTHORIZED: 'errors.sessionExpired',
  FORBIDDEN: 'errors.forbidden',
  NOT_FOUND: 'errors.notFound',
  CONFLICT: 'errors.conflict',
  UNPROCESSABLE: 'errors.validationFailed',
  VALIDATION_ERROR: 'errors.validationFailed',
  RATE_LIMITED: 'errors.tooManyRequests',
  SERVER_ERROR: 'errors.serverError',
};

type ApiErrorResponse = {
  code?: string;
  message?: string | string[];
  statusCode?: number;
};

/**
 * Converts any caught error (Axios, network, unknown) into a safe, UI-ready
 * translation key. Never surfaces raw server messages to the user.
 */
export function normalizeApiError(error: unknown): NormalizedError {
  const axiosError = error as AxiosError<ApiErrorResponse>;

  // Timeout
  if (axiosError?.code === 'ECONNABORTED') {
    return { key: 'errors.timeout' };
  }

  // No response at all → offline / DNS / CORS
  if (axiosError?.code === 'ERR_NETWORK' || !axiosError?.response) {
    return { key: 'errors.networkOffline' };
  }

  const status = axiosError.response?.status;
  const data = axiosError.response?.data;
  const backendCode = data?.code;
  const msg = data?.message;
  const messageStr = Array.isArray(msg) ? msg[0] : typeof msg === 'string' ? msg : '';

  if (status === 403 && messageStr === 'EMAIL_NOT_VERIFIED') {
    return { key: 'errors.emailNotVerified', status };
  }

  // Backend returned a known semantic code
  if (backendCode && BACKEND_CODE_MAP[backendCode]) {
    return { key: BACKEND_CODE_MAP[backendCode], status };
  }

  // Fall back to HTTP status
  switch (status) {
    case 400: return { key: 'errors.badRequest', status };
    case 401: return { key: 'errors.sessionExpired', status };
    case 403: return { key: 'errors.forbidden', status };
    case 404: return { key: 'errors.notFound', status };
    case 409: return { key: 'errors.conflict', status };
    case 422: return { key: 'errors.validationFailed', status };
    case 429: return { key: 'errors.tooManyRequests', status };
    default:
      if (status !== undefined && status >= 500) {
        return { key: 'errors.serverError', status };
      }
      return { key: 'errors.unknownError', status };
  }
}

/**
 * Returns the first validation message from a 400/422 response array,
 * or falls back to the normalized translation key.
 * Used when form-specific field errors should be shown.
 */
export function getValidationMessage(error: unknown): string | null {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  const data = axiosError?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg) && msg.length > 0) return msg[0];
  if (typeof msg === 'string' && msg.trim().length > 0) return msg.trim();
  return null;
}
