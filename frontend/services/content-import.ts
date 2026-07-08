import { api, API_PATHS } from '@/lib/api/client';

export const importCertificationPathsJson = (payload: Record<string, unknown>, dryRun = true) =>
  api
    .post(API_PATHS.admin('content/import/certification-paths-json'), { payload, dryRun })
    .then((r) => r.data);
