import * as path from 'path';

// Load .env from backend/api or project root
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(process.cwd(), '.env') });
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });
} catch {
  // dotenv optional
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CertifCoursesImportService } from '../certifications/certif-courses-import.service';
import { LabsService } from '../labs/labs.service';
import { DataSource } from 'typeorm';
import { runSeed, type SeedProfile } from './seed';
import { ContentIndexerService } from '../content-indexer/content-indexer.service';

function resolveSeedProfile(): SeedProfile {
  const raw = (process.env.SEED_PROFILE ?? 'baseline').toLowerCase();
  if (raw === 'baseline' || raw === 'demo' || raw === 'none') {
    return raw;
  }
  console.warn(`[Seed] Unknown SEED_PROFILE="${raw}", defaulting to "baseline".`);
  return 'baseline';
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const importService = app.get(CertifCoursesImportService);
  const labsService = app.get(LabsService);
  const contentIndexerService = app.get(ContentIndexerService);
  const profile = resolveSeedProfile();
  try {
    await runSeed(dataSource, importService, labsService, profile);
    const runIndexing = (process.env.RUN_INDEXING ?? 'false').toLowerCase() === 'true';
    if (runIndexing) {
      const forceIndex = (process.env.FORCE_INDEX ?? 'false').toLowerCase() === 'true';
      console.log(`[Seed] Starting AI content indexing (force=${forceIndex})...`);
      await contentIndexerService.syncAll(forceIndex);
    } else {
      console.log('[Seed] AI content indexing skipped (run indexing with RUN_INDEXING=true if needed).');
    }
    if (process.platform === 'win32') {
      // Small pause to allow socket cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } finally {
    await app.close();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
