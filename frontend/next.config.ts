import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

/**
 * Voice in the browser (Cartesia TTS, Deepgram STT) reads NEXT_PUBLIC_* at build time.
 * Map server-style names from the repo root `.env` so you can keep a single key pair.
 *
 * `npm run dev --prefix frontend` uses cwd `frontend/`; Next only auto-loads `frontend/.env*`.
 * Keys are often defined only in the monorepo root `.env`, so load parent first, then frontend.
 */
const frontendDir = process.cwd();
const repoRoot = path.resolve(frontendDir, "..");
const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(repoRoot, dev);
loadEnvConfig(frontendDir, dev);

const publicCartesia =
  process.env.NEXT_PUBLIC_CARTESIA_API_KEY || process.env.CARTESIA_API_KEY || "";
const publicDeepgram =
  process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY ||
  process.env.DEEPGRAM_API_KEY ||
  process.env.VITE_DEEPGRAM_API_KEY ||
  "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CARTESIA_API_KEY: publicCartesia,
    NEXT_PUBLIC_DEEPGRAM_API_KEY: publicDeepgram,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    root: frontendDir
  },
  async rewrites() {
    // NOTE: rewrites are resolved at build time in production builds.
    // In Docker, `localhost:3001` points to the frontend container, not the Nest API.
    // Prefer internal docker network hostname (e.g. http://api:3001) when available.
    const backend =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.BACKEND_URL ||
      'http://localhost:3001';
    const base = backend.replace(/\/$/, '');
    // Grafana is reachable in-cluster via the grafana-service DNS name (default namespace).
    // Override with GRAFANA_INTERNAL_URL for local/dev or non-cluster deployments.
    const grafana = (process.env.GRAFANA_INTERNAL_URL || 'http://grafana-service').replace(/\/$/, '');
    const hrCoach = (process.env.HR_COACH_INTERNAL_URL || 'http://127.0.0.1:8083').replace(/\/$/, '');
    const hrCoachGateway = (process.env.HR_COACH_GATEWAY_INTERNAL_URL || 'https://hr-coach-gateway.bravesand-e5d986f3.francecentral.azurecontainerapps.io').replace(/\/$/, '');
    const technicalCoach = (process.env.TECHNICAL_COACH_INTERNAL_URL || 'http://127.0.0.1:8082').replace(/\/$/, '');
    return [
      { source: '/hr-coach-app/api/rh/sessions', destination: `${hrCoachGateway}/rh/sessions` },
      { source: '/hr-coach-app/api/rh/sessions/:path*', destination: `${hrCoachGateway}/rh/sessions/:path*` },
      { source: '/hr-coach-app/api/rh/session/:sessionId', destination: `${hrCoachGateway}/rh/sessions/:sessionId` },
      { source: '/hr-coach-app/api/rh/session/:sessionId/:path*', destination: `${hrCoachGateway}/rh/sessions/:sessionId/:path*` },
      { source: '/hr-coach-app', destination: `${hrCoach}/hr-coach-app` },
      { source: '/hr-coach-app/:path*', destination: `${hrCoach}/hr-coach-app/:path*` },
      { source: '/:locale(en|fr)/hr-coach-app/api/rh/sessions', destination: `${hrCoachGateway}/rh/sessions` },
      { source: '/:locale(en|fr)/hr-coach-app/api/rh/sessions/:path*', destination: `${hrCoachGateway}/rh/sessions/:path*` },
      { source: '/:locale(en|fr)/hr-coach-app/api/rh/session/:sessionId', destination: `${hrCoachGateway}/rh/sessions/:sessionId` },
      { source: '/:locale(en|fr)/hr-coach-app/api/rh/session/:sessionId/:path*', destination: `${hrCoachGateway}/rh/sessions/:sessionId/:path*` },
      { source: '/:locale(en|fr)/hr-coach-app', destination: `${hrCoach}/hr-coach-app` },
      { source: '/:locale(en|fr)/hr-coach-app/:path*', destination: `${hrCoach}/hr-coach-app/:path*` },
      { source: '/technical-coach-app', destination: `${technicalCoach}` },
      { source: '/technical-coach-app/:path*', destination: `${technicalCoach}/:path*` },
      { source: '/:locale(en|fr)/technical-coach-app', destination: `${technicalCoach}` },
      { source: '/:locale(en|fr)/technical-coach-app/:path*', destination: `${technicalCoach}/:path*` },
      { source: '/api/:path*', destination: `${base}/api/:path*` },
      { source: '/uploads/:path*', destination: `${base}/uploads/:path*` },
      // Proxy /monitoring/* to Grafana so it stays on the subul.uk domain.
      // Keeps the /monitoring prefix because Grafana runs with GF_SERVER_SERVE_FROM_SUB_PATH=true.
      { source: '/monitoring', destination: `${grafana}/monitoring` },
      { source: '/monitoring/:path*', destination: `${grafana}/monitoring/:path*` },
    ];
  },
  typescript:{
    ignoreBuildErrors: true,
  },
  
  webpack: (config) => {
    if (dev) {
      config.cache = false;
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './'
    };
    
    // Optimisation des vendor chunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true
          },
          ui: {
            test: /[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 15
          }
        }
      }
    };
    
    return config;
  },
};

export default nextConfig;
