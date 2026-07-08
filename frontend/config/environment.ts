/** Strip trailing /api to avoid duplicate prefix when appending /api/* paths */
function normalizeBackendBase(url: string): string {
  return url.replace(/\/$/, '').replace(/\/api\/?$/, '');
}

export const ENV = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  BACKEND_URL: normalizeBackendBase(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'),
  
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Smartovate',
  APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  ENABLE_ERROR_REPORTING: process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING !== 'false',
  ENABLE_REAL_TIME: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === 'true',
  
  SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GA_ID,
  
  AUTH_COOKIE_NAME: process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || 'auth_session',
  SESSION_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '3600'), // 1 hour
  
  CACHE_TTL: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || '300'), // 5 minutes
  ENABLE_CACHE: process.env.NEXT_PUBLIC_ENABLE_CACHE !== 'false',
  
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  ENABLE_WEBSOCKET: process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true',
  
  MAX_FILE_SIZE: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'), // 10MB
  ALLOWED_FILE_TYPES: process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/json'
  ],
  
  RATE_LIMIT_WINDOW: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW || '900000'), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_MAX || '100'),
  
  DEFAULT_LANGUAGE: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en',
  SUPPORTED_LANGUAGES: process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES?.split(',') || ['en', 'fr'],
  
  
  DEFAULT_THEME: process.env.NEXT_PUBLIC_DEFAULT_THEME || 'light',
  ENABLE_DARK_MODE: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE !== 'false',
} as const;

type EnvConfig = typeof ENV;

export const validateEnv = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (ENV.IS_PRODUCTION) {
    if (!ENV.API_BASE_URL) errors.push('NEXT_PUBLIC_API_URL is required in production');
    if (!ENV.SENTRY_DSN) errors.push('NEXT_PUBLIC_SENTRY_DSN is required in production');
  }
  
  if (ENV.API_BASE_URL && !ENV.API_BASE_URL.startsWith('http')) {
    errors.push('NEXT_PUBLIC_API_URL must start with http:// or https://');
  }
  
  if (ENV.WS_URL && !ENV.WS_URL.startsWith('ws://') && !ENV.WS_URL.startsWith('wss://')) {
    errors.push('NEXT_PUBLIC_WS_URL must start with ws:// or wss://');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const getApiUrl = (endpoint: string): string => {
  const baseUrl = ENV.API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

export const getWsUrl = (path?: string): string => {
  const baseUrl = ENV.WS_URL.replace(/\/$/, '');
  const cleanPath = path?.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath || ''}`;
};

export const getEnvInfo = () => ({
  environment: ENV.NODE_ENV,
  apiBaseUrl: ENV.API_BASE_URL,
  wsUrl: ENV.WS_URL,
  features: {
    analytics: ENV.ENABLE_ANALYTICS,
    errorReporting: ENV.ENABLE_ERROR_REPORTING,
    realTime: ENV.ENABLE_REAL_TIME,
    cache: ENV.ENABLE_CACHE,
    websocket: ENV.ENABLE_WEBSOCKET,
    darkMode: ENV.ENABLE_DARK_MODE,
  },
  validation: validateEnv()
});

export default ENV;
