/**
 * Idempotent import of the Subul certification academy JSON pack (courses, labs, practice exams, paths)
 * + optional Azure Cognitive Search sync. Invoked from Docker entrypoint when AUTO_SEED_CERTIFICATION_PACK=true.
 */
import * as fs from 'fs';
import * as path from 'path';

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(process.cwd(), '.env') });
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });
} catch {
  // optional
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CertifCoursesImportService } from '../certifications/certif-courses-import.service';
import { LabImportService } from '../content-import/lab-import.service';
import { CertificationPathsImportService } from '../content-import/certification-paths-import.service';
import { PracticeExamsService } from '../practice-exams/practice-exams.service';
import { ContentIndexerService } from '../content-indexer/content-indexer.service';
import {
  unwrapCoursesCertificationsPayload,
  unwrapLabsPayload,
  unwrapPracticeExamsPayload,
  unwrapCertificationPathsPayload,
  normalizeInteractiveLabRow,
} from './certification-pack-json';

function resolvePackDir(): string {
  const rel = process.env.CERTIFICATION_PACK_DIR ?? 'seed/subul-certification-pack';
  const abs = path.isAbsolute(rel) ? rel : path.resolve(process.cwd(), rel);
  return abs;
}

function readJsonFile(filePath: string): unknown {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Certification pack file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    throw new Error(
      `Invalid JSON in ${filePath}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

async function main() {
  const force = (process.env.FORCE_CERT_PACK_IMPORT ?? '').toLowerCase();
  const forced = force === '1' || force === 'true' || force === 'yes';
  const startFlag = (
    process.env.CONTENT_PACK_IMPORT_ON_START ??
    process.env.AUTO_SEED_CERTIFICATION_PACK ??
    'false'
  ).toLowerCase();
  const startEnabled = startFlag === 'true' || startFlag === '1' || startFlag === 'yes';
  if (!forced && !startEnabled) {
    console.log(
      '[CertPack] Skipping import (set CONTENT_PACK_IMPORT_ON_START=true for boot import, or FORCE_CERT_PACK_IMPORT=1 for explicit command).',
    );
    process.exit(0);
  }

  const packDir = resolvePackDir();
  if (!fs.existsSync(packDir)) {
    console.warn(`[CertPack] Directory not found (${packDir}) — skipping pack import.`);
    process.exit(0);
  }

  console.log(`[CertPack] Using pack directory: ${packDir}`);

  const coursesPath = path.join(packDir, 'courses-certifications.json');
  const labsPath = path.join(packDir, 'interactive-labs.json');
  const examsPath = path.join(packDir, 'practice-exams.json');
  const pathsPath = path.join(packDir, 'certification-paths.json');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const certImport = app.get(CertifCoursesImportService);
  const labImport = app.get(LabImportService);
  const practiceExams = app.get(PracticeExamsService);
  const pathImport = app.get(CertificationPathsImportService);
  const indexer = app.get(ContentIndexerService);

  try {
    // 1) Courses + certifications
    const coursesRaw = readJsonFile(coursesPath);
    const coursesPayload = unwrapCoursesCertificationsPayload(coursesRaw);
    console.log('[CertPack] Importing courses-certifications.json (admin_upsert)...');
    const coursesSummary = await certImport.importFromPayload(
      coursesPayload as Record<string, unknown>,
      'admin_upsert',
      { dryRun: false },
    );
    console.log(
      `[CertPack] Courses import — certifications c/u/s=${coursesSummary.certifications.created}/${coursesSummary.certifications.updated}/${coursesSummary.certifications.skipped}, courses c/u/s=${coursesSummary.courses.created}/${coursesSummary.courses.updated}/${coursesSummary.courses.skipped}, modules c/u/s=${coursesSummary.modules.created}/${coursesSummary.modules.updated}/${coursesSummary.modules.skipped}, lessons c/u/s=${coursesSummary.lessons.created}/${coursesSummary.lessons.updated}/${coursesSummary.lessons.skipped}, quizzes c/u/s=${coursesSummary.quizzes.created}/${coursesSummary.quizzes.updated}/${coursesSummary.quizzes.skipped}, labs c/u/s=${coursesSummary.labs.created}/${coursesSummary.labs.updated}/${coursesSummary.labs.skipped}`,
    );
    if (coursesSummary.errors?.length) {
      throw new Error(
        `Courses import reported ${coursesSummary.errors.length} issue(s). Fix payload errors before retrying.`,
      );
    }

    // 2) Interactive labs
    const labsRaw = readJsonFile(labsPath);
    const labsArr = unwrapLabsPayload(labsRaw).map((row) => normalizeInteractiveLabRow(row));
    console.log('[CertPack] Importing interactive-labs.json...');
    const labsResult = await labImport.importLabs(labsArr, false);
    console.log(
      `[CertPack] Labs import — created=${labsResult.created}, updated=${labsResult.updated}, skipped=${labsResult.skipped}`,
    );
    if (labsResult.errors?.length) {
      throw new Error(
        `Labs import reported ${labsResult.errors.length} issue(s). Fix payload errors before retrying.`,
      );
    }

    // 3) Practice exams
    const examsRaw = readJsonFile(examsPath);
    const examsArr = unwrapPracticeExamsPayload(examsRaw);
    console.log('[CertPack] Importing practice-exams.json...');
    const examsSummary = await practiceExams.importFromJson(examsArr, false);
    console.log(
      `[CertPack] Practice exams — exams c/u/s=${examsSummary.exams.created}/${examsSummary.exams.updated}/${examsSummary.exams.skipped}, questions c/u/s=${examsSummary.questions.created}/${examsSummary.questions.updated}/${examsSummary.questions.skipped}`,
    );

    // 4) Certification paths
    const pathsRaw = readJsonFile(pathsPath);
    const pathsPayload = unwrapCertificationPathsPayload(pathsRaw);
    console.log('[CertPack] Importing certification-paths.json...');
    const pathsSummary = await pathImport.importFromJson(pathsPayload, false);
    console.log(
      `[CertPack] Paths — paths c/u/s=${pathsSummary.paths.created}/${pathsSummary.paths.updated}/${pathsSummary.paths.skipped}, steps created=${pathsSummary.steps.created}`,
    );
    if (pathsSummary.errors?.length) {
      const details = pathsSummary.errors
        .slice(0, 20)
        .map((e) => `${e.path}: ${e.message}`)
        .join('\n');
      throw new Error(
        `Path import validation failed with ${pathsSummary.errors.length} issue(s):\n${details}`,
      );
    }

    // 5) AI Tutor indexing — skipped at boot to avoid blocking the HTTP server.
    // The nightly @Cron('0 2 * * *') in ContentIndexerService will index any
    // unindexed content. Admins can also trigger a manual sync from the dashboard.
    console.log('[CertPack] AI Tutor indexing deferred — HTTP server will start immediately.');
    void indexer; // reference kept to avoid unused-import warnings
  } finally {
    if (process.platform !== 'win32') {
      await app.close();
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[CertPack] Fatal:', err);
  process.exit(1);
});
