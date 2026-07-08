import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LearnerTrack } from '../certifications/utils/cert-domain.util';
import { User } from '../users/entities/user.entity';
import { Lab } from './entities/lab.entity';
import { LabProgress } from './entities/lab-progress.entity';
import { getAllSeedLabRows } from './labs-seed.data';
import {
  inferLabTrackFromInteractiveSlug,
  labSlugPatternsForCourseId,
} from './utils/lab-course-association.util';
import { TranslationService } from '../translation/translation.service';

export interface LabStatRow {
  labId: number;
  slug: string;
  title: string | null;
  totalStarts: number;
  totalCompletions: number;
  avgTimeSpent: number;
  completionRate: number;
}

@Injectable()
export class LabsService {
  private readonly logger = new Logger(LabsService.name);

  constructor(
    @InjectRepository(Lab)
    private readonly labRepository: Repository<Lab>,
    @InjectRepository(LabProgress)
    private readonly labProgressRepository: Repository<LabProgress>,
    private readonly translationService: TranslationService,
  ) {}

  async create(createLabDto: any): Promise<Lab> {
    const lab = this.labRepository.create({
      ...createLabDto,
      id: undefined,
      slug: createLabDto.slug,
    });
    const savedLab = await this.labRepository.save(lab) as unknown as Lab;
    return Array.isArray(savedLab) ? savedLab[0] : savedLab;
  }

  async findAll(track?: string): Promise<Lab[]> {
    const where: Record<string, any> = { status: 'published' };
    if (track && ['cloud', 'cyber', 'ai'].includes(track)) {
      where['track'] = track;
    }
    return await this.labRepository.find({ where, order: { createdAt: 'ASC' } });
  }

  /** Published labs whose track is one of the given tracks (strict; no null-track rows). */
  async findPublishedForTracks(tracks: LearnerTrack[]): Promise<Lab[]> {
    if (tracks.length === 0) {
      return [];
    }
    return this.labRepository.find({
      where: { status: 'published', track: In(tracks) },
      order: { createdAt: 'ASC' },
    });
  }

  /** Published labs whose slug matches any ILIKE pattern (patterns from enrolled courses). */
  private async findPublishedMatchingSlugPatterns(patterns: string[]): Promise<Lab[]> {
    if (patterns.length === 0) {
      return [];
    }
    const params: Record<string, string> = {};
    const orSql = patterns
      .map((pat, i) => {
        const k = `pat${i}`;
        params[k] = pat;
        return `l.slug ILIKE :${k}`;
      })
      .join(' OR ');
    return this.labRepository
      .createQueryBuilder('l')
      .where('l.status = :st', { st: 'published' })
      .andWhere(`(${orSql})`, params)
      .orderBy('l.createdAt', 'ASC')
      .getMany();
  }

  /**
   * Scoped learner labs: union of track-matched published labs and labs whose slugs match enrolled course IDs.
   */
  async findPublishedForLearnerProfile(
    enrolledCourseIds: string[],
    tracks: LearnerTrack[],
  ): Promise<Lab[]> {
    const patternSet = new Set<string>();
    for (const cid of enrolledCourseIds) {
      for (const p of labSlugPatternsForCourseId(cid)) {
        patternSet.add(p);
      }
    }
    const patterns = [...patternSet];

    if (tracks.length === 0 && patterns.length === 0) {
      return [];
    }

    const [byTrack, bySlug] = await Promise.all([
      tracks.length ? this.findPublishedForTracks(tracks) : Promise.resolve([] as Lab[]),
      patterns.length ? this.findPublishedMatchingSlugPatterns(patterns) : Promise.resolve([] as Lab[]),
    ]);

    const map = new Map<number, Lab>();
    for (const l of byTrack) {
      map.set(l.id, l);
    }
    for (const l of bySlug) {
      map.set(l.id, l);
    }
    return [...map.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /** Published interactive labs linked to a platform course id (exam code, etc.). */
  async findPublishedLabsForCourseId(courseIdStr: string): Promise<Lab[]> {
    const patterns = labSlugPatternsForCourseId(courseIdStr);
    if (patterns.length === 0) {
      return [];
    }
    return this.findPublishedMatchingSlugPatterns(patterns);
  }

  toPublicLabDto(lab: Lab, locale = 'en') {
    const normalised = locale.toLowerCase().split('-')[0];
    const hit = normalised !== 'en' ? (lab.translations ?? {})[normalised] ?? null : null;
    const meta = lab.metadata ?? null;
    const translatedMeta = hit
      ? { ...meta, learningObjectives: hit.learningObjectives ?? meta?.learningObjectives }
      : meta;
    return {
      id: lab.id,
      slug: lab.slug,
      title: hit?.title ?? lab.title,
      description: hit?.description ?? lab.description,
      provider: lab.provider,
      difficulty: lab.difficulty,
      estimatedTime: lab.estimatedTime,
      estimatedDurationMinutes: lab.estimatedDurationMinutes ?? null,
      moduleTitle: lab.moduleTitle,
      tasks: hit?.tasks ?? lab.tasks ?? [],
      steps: lab.steps ?? null,
      metadata: translatedMeta,
      track: lab.track ?? null,
      status: lab.status,
      createdAt: lab.createdAt,
      updatedAt: lab.updatedAt,
    };
  }

  private async fillLabTranslation(lab: Lab, locale: string): Promise<void> {
    if ((lab.translations ?? {})[locale]) return; // already cached
    if (!this.translationService.isConfigured()) return;
    try {
      const translated = await this.translationService.translateLabFields(
        {
          title: lab.title ?? '',
          description: lab.description ?? '',
          tasks: lab.tasks ?? [],
          learningObjectives: lab.metadata?.learningObjectives ?? [],
        },
        locale,
      );
      lab.translations = { ...(lab.translations ?? {}), [locale]: translated };
      await this.labRepository.save(lab);
    } catch (err) {
      this.logger.warn(`[fillLabTranslation] Failed for slug "${lab.slug}" locale "${locale}": ${(err as Error).message}`);
    }
  }

  async findAllAdmin(): Promise<Lab[]> {
    return await this.labRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(slug: string, locale = 'en'): Promise<Lab> {
    const lab = await this.labRepository.findOne({ where: { slug } });
    if (!lab) {
      throw new NotFoundException(`Lab with slug "${slug}" not found`);
    }
    const normalised = locale.toLowerCase().split('-')[0];
    if (normalised !== 'en') {
      await this.fillLabTranslation(lab, normalised);
    }
    return lab;
  }

  async update(slug: string, updateLabDto: any): Promise<Lab> {
    const lab = await this.findOne(slug);
    const updatedLab = this.labRepository.merge(lab, updateLabDto);
    return await this.labRepository.save(updatedLab);
  }

  async remove(slug: string): Promise<void> {
    const lab = await this.findOne(slug);
    await this.labRepository.remove(lab);
  }

  async getOrCreateProgress(user: User, labSlug: string): Promise<LabProgress> {
    const lab = await this.findOne(labSlug);

    let progress = await this.labProgressRepository.findOne({
      where: { userId: user.id, labId: lab.id },
      relations: ['lab', 'user']
    });

    if (!progress) {
      progress = this.labProgressRepository.create({
        user,
        lab,
        userId: user.id,
        labId: lab.id,
        completedTasks: [],
        isCompleted: false,
        startedAt: new Date(),
        timeSpent: 0,
      });
      progress = await this.labProgressRepository.save(progress);
    }

    return progress;
  }

  async updateProgress(user: User, labSlug: string, updateProgressDto: any): Promise<LabProgress> {
    const progress = await this.getOrCreateProgress(user, labSlug);

    if (updateProgressDto.completedTasks) {
      progress.completedTasks = updateProgressDto.completedTasks;
    }

    if (updateProgressDto.isCompleted !== undefined) {
      progress.isCompleted = updateProgressDto.isCompleted;
      if (updateProgressDto.isCompleted && !progress.completedAt) {
        progress.completedAt = new Date();
      }
    }

    if (updateProgressDto.notes) {
      progress.notes = { ...progress.notes, ...updateProgressDto.notes };
    }

    if (updateProgressDto.timeSpent !== undefined) {
      progress.timeSpent = updateProgressDto.timeSpent;
    }

    return await this.labProgressRepository.save(progress);
  }

  async getUserProgress(user: User): Promise<LabProgress[]> {
    return await this.labProgressRepository.find({
      where: { userId: user.id },
      relations: ['lab'],
      order: { createdAt: 'DESC' }
    });
  }

  async getUserProgressByUserId(userId: number): Promise<LabProgress[]> {
    return await this.labProgressRepository.find({
      where: { userId },
      relations: ['lab'],
      order: { createdAt: 'DESC' }
    });
  }

  async getUserProgressForLab(user: User, labSlug: string): Promise<LabProgress> {
    const lab = await this.findOne(labSlug);
    const progress = await this.labProgressRepository.findOne({
      where: { userId: user.id, labId: lab.id },
      relations: ['lab', 'user']
    });

    if (!progress) {
      throw new NotFoundException(`Progress not found for lab "${labSlug}"`);
    }

    return progress;
  }

  async getLabStats(): Promise<LabStatRow[]> {
    const labs = await this.labRepository.find({ order: { createdAt: 'ASC' } });
    const stats: LabStatRow[] = [];

    for (const lab of labs) {
      const progressRows = await this.labProgressRepository.find({
        where: { labId: lab.id },
      });
      const totalStarts = progressRows.length;
      const totalCompletions = progressRows.filter((p) => p.isCompleted).length;
      const avgTimeSpent =
        totalStarts > 0
          ? Math.round(progressRows.reduce((s, p) => s + (p.timeSpent ?? 0), 0) / totalStarts)
          : 0;
      const completionRate = totalStarts > 0 ? Math.round((totalCompletions / totalStarts) * 100) : 0;

      stats.push({
        labId: lab.id,
        slug: lab.slug,
        title: lab.title,
        totalStarts,
        totalCompletions,
        avgTimeSpent,
        completionRate,
      });
    }

    return stats;
  }

  /**
   * Seed / upsert labs from `labs-seed.data.ts` (hubs, AZ-900 track, AWS EC2 track).
   * Idempotent: updates existing rows by `slug`, inserts missing.
   */
  async seedAwsLabs(): Promise<void> {
    const rows = getAllSeedLabRows();
    let upserted = 0;
    for (const row of rows) {
      const existing = await this.labRepository.findOne({ where: { slug: row.slug } });
      const entity = this.labRepository.create({
        ...row,
        track: inferLabTrackFromInteractiveSlug(row.slug),
        ...(existing ? { id: existing.id } : {}),
      });
      await this.labRepository.save(entity);
      upserted += 1;
    }
    console.log(`[Labs] Seed upsert complete: ${upserted} row(s).`);
  }
}
