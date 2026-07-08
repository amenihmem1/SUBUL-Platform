import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCv } from './entities/user-cv.entity';

export interface CvStatusResponse {
  hasCv: boolean;
  status: 'ready' | 'missing';
  fileName?: string | null;
  lastUploadedAt?: string | null;
  atsScore?: number | null;
  lastAnalyzedAt?: string | null;
  cvPreview?: {
    fullName?: string | null;
    role?: string | null;
    yearsExp?: string | null;
    domain?: string | null;
    industry?: string | null;
    seniority?: string | null;
    summary?: string | null;
    skills?: string[];
    skillsCount?: number;
    email?: string | null;
    education?: string | null;
    languages?: string | null;
  } | null;
}

@Injectable()
export class UserCvService {
  constructor(
    @InjectRepository(UserCv)
    private readonly userCvRepo: Repository<UserCv>,
  ) {}

  async findByUserId(userId: number): Promise<UserCv | null> {
    return this.userCvRepo.findOne({ where: { userId } });
  }

  async upsert(
    userId: number,
    data: {
      filePath?: string;
      fileName?: string;
      fileSize?: number;
      fileMime?: string;
      extractedData?: Record<string, unknown>;
      atsScore?: number;
      lastAnalyzedAt?: Date;
    },
  ): Promise<UserCv> {
    const existing = await this.userCvRepo.findOne({ where: { userId } });

    if (existing) {
      const updated = this.userCvRepo.merge(existing, {
        ...data,
        updatedAt: new Date(),
      });
      return this.userCvRepo.save(updated);
    }

    const created = this.userCvRepo.create({
      userId,
      ...data,
    });
    return this.userCvRepo.save(created);
  }

  async remove(userId: number): Promise<void> {
    await this.userCvRepo.delete({ userId });
  }

  toStatusResponse(cv: UserCv | null): CvStatusResponse {
    if (!cv) {
      return {
        hasCv: false,
        status: 'missing',
        fileName: null,
        lastUploadedAt: null,
        atsScore: null,
        lastAnalyzedAt: null,
        cvPreview: null,
      };
    }

    const extracted = cv.extractedData ?? {};
    const rawSkills = extracted['skills'];
    let skillsArr: string[] = [];
    if (typeof rawSkills === 'string') {
      skillsArr = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(rawSkills)) {
      skillsArr = rawSkills.map(String).filter(Boolean);
    } else if (rawSkills && typeof rawSkills === 'object') {
      skillsArr = Object.keys(rawSkills);
    }

    const firstName = (extracted['first_name'] as string) || '';
    const lastName = (extracted['last_name'] as string) || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

    return {
      hasCv: true,
      status: 'ready',
      fileName: cv.fileName ?? null,
      lastUploadedAt: cv.updatedAt ? cv.updatedAt.toISOString() : (cv.createdAt ? cv.createdAt.toISOString() : null),
      atsScore: cv.atsScore ?? null,
      lastAnalyzedAt: cv.lastAnalyzedAt ? cv.lastAnalyzedAt.toISOString() : null,
      cvPreview: {
        fullName,
        role: (extracted['role'] as string) ?? null,
        yearsExp: (extracted['years_exp'] as string) ?? null,
        domain: (extracted['domain'] as string) ?? null,
        industry: (extracted['industry'] as string) ?? null,
        seniority: (extracted['seniority'] as string) ?? null,
        summary: (extracted['summary'] as string) ?? null,
        skills: skillsArr.length > 0 ? skillsArr : undefined,
        skillsCount: skillsArr.length || undefined,
        email: (extracted['email'] as string) ?? null,
        education: (extracted['education'] as string) ?? null,
        languages: (extracted['languages'] as string) ?? null,
      },
    };
  }
}
