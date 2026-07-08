import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { LabCloudCredential } from './entities/lab-cloud-credential.entity';
import { LabAccessSession } from './entities/lab-access-session.entity';
import { CreateLabCredentialDto, UpdateLabCredentialDto } from './dto/create-lab-credential.dto';
import { GrantLabAccessDto, BulkGrantLabAccessDto } from './dto/grant-lab-access.dto';

export interface LabAccessResponse {
  hasAccess: boolean;
  provider: string;
  expiresAt: string | null;
  secondsRemaining: number | null;
  sessionId: number | null;
  credential: {
    consoleUrl: string | null;
    loginEmail: string | null;
    loginPassword: string | null;
    accessKey: string | null;
    secretKey: string | null;
    extraFields: Record<string, string> | null;
    credentialType: string;
  } | null;
}

@Injectable()
export class LabAccessService {
  private readonly logger = new Logger(LabAccessService.name);

  constructor(
    @InjectRepository(LabCloudCredential)
    private readonly credRepo: Repository<LabCloudCredential>,
    @InjectRepository(LabAccessSession)
    private readonly sessionRepo: Repository<LabAccessSession>,
  ) {}

  // ─── Credential Pool Management (Admin) ───────────────────────────────────

  async listCredentials(provider?: string): Promise<LabCloudCredential[]> {
    const where: Record<string, any> = {};
    if (provider) where['provider'] = provider;
    return this.credRepo.find({ where, order: { provider: 'ASC', label: 'ASC' } });
  }

  async createCredential(dto: CreateLabCredentialDto): Promise<LabCloudCredential> {
    const cred = this.credRepo.create({
      provider: dto.provider as any,
      label: dto.label,
      credentialType: (dto.credentialType ?? 'sandbox_account') as any,
      consoleUrl: dto.consoleUrl ?? null,
      loginEmail: dto.loginEmail ?? null,
      loginPassword: dto.loginPassword ?? null,
      accessKey: dto.accessKey ?? null,
      secretKey: dto.secretKey ?? null,
      extraFields: dto.extraFields ?? null,
      notes: dto.notes ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.credRepo.save(cred);
  }

  async updateCredential(id: number, dto: UpdateLabCredentialDto): Promise<LabCloudCredential> {
    const cred = await this.credRepo.findOne({ where: { id } });
    if (!cred) throw new NotFoundException(`Credential #${id} not found`);
    Object.assign(cred, {
      ...(dto.provider !== undefined && { provider: dto.provider }),
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.credentialType !== undefined && { credentialType: dto.credentialType }),
      ...(dto.consoleUrl !== undefined && { consoleUrl: dto.consoleUrl }),
      ...(dto.loginEmail !== undefined && { loginEmail: dto.loginEmail }),
      ...(dto.loginPassword !== undefined && { loginPassword: dto.loginPassword }),
      ...(dto.accessKey !== undefined && { accessKey: dto.accessKey }),
      ...(dto.secretKey !== undefined && { secretKey: dto.secretKey }),
      ...(dto.extraFields !== undefined && { extraFields: dto.extraFields }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
    return this.credRepo.save(cred);
  }

  async deleteCredential(id: number): Promise<void> {
    const cred = await this.credRepo.findOne({ where: { id } });
    if (!cred) throw new NotFoundException(`Credential #${id} not found`);
    await this.credRepo.remove(cred);
  }

  /** Returns credential enriched with current usage count */
  async listCredentialsWithStatus(provider?: string) {
    const credentials = await this.listCredentials(provider);
    const now = new Date();

    return Promise.all(
      credentials.map(async (c) => {
        const activeCount = await this.sessionRepo.count({
          where: {
            credentialId: c.id,
            isActive: true,
            expiresAt: MoreThan(now),
          },
        });
        return { ...this.safeCredential(c), activeSessionCount: activeCount };
      }),
    );
  }

  // ─── Session Management (Admin) ────────────────────────────────────────────

  async grantAccess(adminId: number, dto: GrantLabAccessDto): Promise<LabAccessSession> {
    const { userId, provider, durationHours, credentialId, notes } = dto;

    // Resolve credential: explicit pick or auto-assign first available
    let resolvedCredentialId: number | null = null;
    if (credentialId) {
      const cred = await this.credRepo.findOne({ where: { id: credentialId, isActive: true } });
      if (!cred) throw new BadRequestException(`Credential #${credentialId} not found or inactive`);
      resolvedCredentialId = cred.id;
    } else {
      // Auto-pick: find an active credential for this provider not already in use
      const now = new Date();
      const busy = await this.sessionRepo
        .createQueryBuilder('s')
        .select('s.credential_id', 'cid')
        .where('s.provider = :provider', { provider })
        .andWhere('s.is_active = true')
        .andWhere('s.expires_at > :now', { now })
        .andWhere('s.credential_id IS NOT NULL')
        .getRawMany<{ cid: number }>();
      const busyIds = busy.map((r) => r.cid);

      const available = await this.credRepo
        .createQueryBuilder('c')
        .where('c.provider = :provider', { provider })
        .andWhere('c.is_active = true')
        .andWhere(busyIds.length > 0 ? 'c.id NOT IN (:...busyIds)' : '1=1', { busyIds })
        .orderBy('c.id', 'ASC')
        .getOne();

      resolvedCredentialId = available?.id ?? null;
    }

    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    // Upsert: revoke existing session for user+provider, then create new one
    const existing = await this.sessionRepo.findOne({ where: { userId, provider } });
    if (existing) {
      existing.isActive = false;
      existing.revokedAt = new Date();
      await this.sessionRepo.save(existing);
      // Remove so UNIQUE constraint allows re-insert
      await this.sessionRepo.delete(existing.id);
    }

    const session = this.sessionRepo.create({
      userId,
      provider,
      credentialId: resolvedCredentialId,
      grantedBy: adminId,
      expiresAt,
      isActive: true,
      notes: notes ?? null,
    });

    this.logger.log(`Admin ${adminId} granted ${provider} access to user ${userId} until ${expiresAt.toISOString()}`);
    return this.sessionRepo.save(session);
  }

  async revokeAccess(sessionId: number): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session #${sessionId} not found`);
    session.isActive = false;
    session.revokedAt = new Date();
    await this.sessionRepo.save(session);
  }

  async listActiveSessions(provider?: string) {
    const now = new Date();
    const qb = this.sessionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'u')
      .leftJoinAndSelect('s.credential', 'c')
      .where('s.is_active = true')
      .andWhere('s.expires_at > :now', { now });

    if (provider) qb.andWhere('s.provider = :provider', { provider });

    const sessions = await qb.orderBy('s.granted_at', 'DESC').getMany();

    return sessions.map((s) => ({
      id: s.id,
      provider: s.provider,
      grantedAt: s.grantedAt,
      expiresAt: s.expiresAt,
      secondsRemaining: Math.max(0, Math.floor((s.expiresAt.getTime() - now.getTime()) / 1000)),
      notes: s.notes,
      user: {
        id: s.user?.id,
        fullName: s.user?.fullName ?? s.user?.email?.split('@')[0],
        email: s.user?.email,
      },
      credential: s.credential ? { id: s.credential.id, label: s.credential.label } : null,
    }));
  }

  async bulkGrantAccess(
    adminId: number,
    dto: BulkGrantLabAccessDto,
  ): Promise<{ granted: number; failed: number; errors: string[] }> {
    let granted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of dto.userIds) {
      try {
        await this.grantAccess(adminId, {
          userId,
          provider: dto.provider,
          durationHours: dto.durationHours,
          credentialId: dto.credentialId,
          notes: dto.notes,
        });
        granted++;
      } catch (err: any) {
        failed++;
        errors.push(`User ${userId}: ${err?.message ?? 'unknown error'}`);
      }
    }

    return { granted, failed, errors };
  }

  // ─── Learner-facing ───────────────────────────────────────────────────────

  async getMyAccessSession(userId: number, provider: string): Promise<LabAccessResponse> {
    const now = new Date();
    const session = await this.sessionRepo.findOne({
      where: { userId, provider, isActive: true },
      relations: ['credential'],
    });

    const isValid = session && session.expiresAt > now;

    if (!isValid) {
      return { hasAccess: false, provider, expiresAt: null, secondsRemaining: null, sessionId: null, credential: null };
    }

    const secondsRemaining = Math.max(0, Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000));
    const cred = session.credential;

    return {
      hasAccess: true,
      provider,
      expiresAt: session.expiresAt.toISOString(),
      secondsRemaining,
      sessionId: session.id,
      credential: cred
        ? {
            consoleUrl: cred.consoleUrl,
            loginEmail: cred.loginEmail,
            loginPassword: cred.loginPassword,
            accessKey: cred.accessKey,
            secretKey: cred.secretKey,
            extraFields: cred.extraFields,
            credentialType: cred.credentialType,
          }
        : null,
    };
  }

  // Strips sensitive data for admin list views
  private safeCredential(c: LabCloudCredential) {
    return {
      id: c.id,
      provider: c.provider,
      label: c.label,
      credentialType: c.credentialType,
      consoleUrl: c.consoleUrl,
      loginEmail: c.loginEmail,
      loginPassword: c.loginPassword,
      accessKey: c.accessKey,
      secretKey: c.secretKey,
      extraFields: c.extraFields,
      notes: c.notes,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
