/**
 * Lightweight standalone seed that upserts only the labs table.
 * Used by AUTO_SEED_LABS_ON_BOOT in docker-entrypoint.sh so every
 * deploy automatically refreshes lab content without running the full
 * baseline seed.
 */
import * as path from 'path';

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(process.cwd(), '.env') });
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });
} catch {
  // dotenv optional
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { LabsService } from '../labs/labs.service';

async function main() {
  console.log('[seed-labs] Upserting labs from labs-seed.data.ts...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const labsService = app.get(LabsService);
  try {
    await labsService.seedAwsLabs();
    console.log('[seed-labs] Labs upsert complete.');
  } finally {
    await app.close();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-labs] Failed:', err);
  process.exit(1);
});
