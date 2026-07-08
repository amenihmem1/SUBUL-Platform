/**
 * Axios instance for unauthenticated public API reads (plans, pricing).
 * No cookies — avoids credentialed CORS requirements on cross-origin setups.
 */
import axios, { type AxiosInstance } from 'axios';

function normalizeBackendUrl(url: string): string {
  return url.replace(/\/$/, '').replace(/\/api\/?$/, '');
}

const baseURL =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BACKEND_URL
    ? normalizeBackendUrl(process.env.NEXT_PUBLIC_BACKEND_URL)
    : 'http://localhost:3001';

const publicApi: AxiosInstance = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 30000,
});

export default publicApi;
