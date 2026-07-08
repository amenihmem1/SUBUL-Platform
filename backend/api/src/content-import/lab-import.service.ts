import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lab } from '../labs/entities/lab.entity';
import { LabsService } from '../labs/labs.service';
import { CreateLabDto } from '../labs/dto/create-lab.dto';

type LabImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ slug?: string; index: number; reason: string }>;
};

@Injectable()
export class LabImportService {
  constructor(
    private readonly labsService: LabsService,
    @InjectRepository(Lab)
    private readonly labRepository: Repository<Lab>,
  ) {}

  async importLabs(payload: Array<Record<string, unknown>>, dryRun = true) {
    if (!Array.isArray(payload)) {
      throw new BadRequestException('payload must be an array');
    }

    const result: LabImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
    const seenSlugs = new Set<string>();

    for (const [index, row] of payload.entries()) {
      const slug = String(row.slug ?? '').trim();
      const title = String(row.title ?? '').trim();
      const steps = Array.isArray(row.steps) ? row.steps : [];
      const tasks = Array.isArray(row.tasks) ? row.tasks : [];

      if (!slug) {
        result.errors.push({ index, reason: 'Missing lab slug' });
        result.skipped += 1;
        continue;
      }
      if (seenSlugs.has(slug)) {
        result.errors.push({ index, slug, reason: 'Duplicate lab slug in payload' });
        result.skipped += 1;
        continue;
      }
      seenSlugs.add(slug);
      if (!title) {
        result.errors.push({ index, slug, reason: 'Missing lab title' });
        result.skipped += 1;
        continue;
      }
      if (!steps.length && !tasks.length) {
        result.errors.push({ index, slug, reason: 'Lab must include tasks or steps' });
        result.skipped += 1;
        continue;
      }

      const existing = await this.labRepository.findOne({ where: { slug } });
      if (existing) {
        result.updated += 1;
      } else {
        result.created += 1;
      }

      if (dryRun) {
        continue;
      }

      const normalized: CreateLabDto = {
        slug,
        title,
        description: row.description ? String(row.description) : undefined,
        provider: (row.provider as string) ?? 'aws',
        difficulty: (row.difficulty as string) ?? 'beginner',
        estimatedTime: row.estimatedTime ? String(row.estimatedTime) : undefined,
        estimatedDurationMinutes: typeof row.estimatedDurationMinutes === 'number'
          ? row.estimatedDurationMinutes
          : undefined,
        moduleTitle: row.moduleTitle ? String(row.moduleTitle) : undefined,
        status: (row.status as string) ?? 'draft',
        tasks: tasks as string[],
        steps: steps as any[],
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        track: (row.track as string) ?? undefined,
      };

      if (existing) {
        await this.labsService.update(slug, normalized);
      } else {
        await this.labsService.create(normalized);
      }
    }

    return { dryRun, ...result };
  }
}
