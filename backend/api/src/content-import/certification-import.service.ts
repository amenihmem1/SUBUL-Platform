import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certification } from '../certifications/entities/certification.entity';
import { Course } from '../courses/entities/course.entity';
import { CertificationImportItemDto } from './dto/import-content.dto';

@Injectable()
export class CertificationImportService {
  constructor(
    @InjectRepository(Certification)
    private readonly certificationRepository: Repository<Certification>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async importCertifications(payload: CertificationImportItemDto[], dryRun = true) {
    if (!Array.isArray(payload)) {
      throw new BadRequestException('payload must be an array');
    }

    const seenExternalIds = new Set<string>();
    const result = {
      dryRun,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ index: number; externalId?: string; reason: string }>,
    };

    for (const [index, item] of payload.entries()) {
      if (!item.title?.trim() || !item.provider?.trim()) {
        result.skipped += 1;
        result.errors.push({ index, reason: 'Missing required title/provider' });
        continue;
      }
      if (item.externalId) {
        if (seenExternalIds.has(item.externalId)) {
          result.skipped += 1;
          result.errors.push({ index, externalId: item.externalId, reason: 'Duplicate externalId in payload' });
          continue;
        }
        seenExternalIds.add(item.externalId);
      }

      let certification =
        (item.externalId
          ? await this.certificationRepository.findOne({ where: { externalId: item.externalId } })
          : null) ??
        (await this.certificationRepository.findOne({ where: { title: item.title } }));

      if (certification) {
        result.updated += 1;
      } else {
        result.created += 1;
      }

      if (dryRun) {
        continue;
      }

      const entity = certification ?? this.certificationRepository.create();
      Object.assign(entity, {
        title: item.title.trim(),
        provider: item.provider.trim(),
        description: item.description ?? '',
        status: item.status ?? entity.status ?? 'Draft',
        externalId: item.externalId ?? entity.externalId,
        available: entity.available ?? true,
      });
      certification = await this.certificationRepository.save(entity);

      if (item.linkedCourseIds?.length) {
        for (const courseId of item.linkedCourseIds) {
          const course = await this.courseRepository.findOne({ where: { courseId } });
          if (!course) {
            result.errors.push({ index, externalId: item.externalId, reason: `Invalid course reference: ${courseId}` });
            continue;
          }
          if (course.certificationId !== certification.id) {
            course.certificationId = certification.id;
            await this.courseRepository.save(course);
          }
        }
      }
    }

    return result;
  }
}
