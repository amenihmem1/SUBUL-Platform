import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { UserRoadmap } from '../roadmap/entities/roadmap.entity';
import { QuizLevelResult } from '../quiz-results/entities/quiz-level-result.entity';
import { AssessmentResult } from '../quiz-results/entities/assessment-result.entity';
import { normalizeAssessmentDomainToTrack } from '../certifications/utils/cert-domain.util';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { effectiveRoleForEmail } from '../auth/admin-emails';

// Roles that receive an automatic 24-hour free trial on account creation
const TRIAL_ROLES = new Set(['learner', 'student']);

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @InjectRepository(UserRoadmap)
    private readonly roadmapRepo: Repository<UserRoadmap>,
    @InjectRepository(QuizLevelResult)
    private readonly quizRepo: Repository<QuizLevelResult>,
    @InjectRepository(AssessmentResult)
    private readonly assessmentRepo: Repository<AssessmentResult>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    return user ? ({ ...user, role: effectiveRoleForEmail(user.role, user.email) } as User) : null;
  }

  async createLocalUser(data: {
    email: string;
    password: string;
    fullName?: string;
    role?: string;
    companyName?: string;
    universityId?: string;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = this.userRepository.create({
      email: data.email,
      passwordHash,
      fullName: data.fullName || data.email.split('@')[0],
      role: data.role || 'learner',
      companyName: data.companyName || '',
      universityId: data.universityId,
      status: 'active',
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const saved = await this.userRepository.save(user);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.userRepository.update(id, {
      lastLogin: new Date(),
      updatedAt: new Date(),
    });
  }

  async findById(id: number): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    return user ? ({ ...user, role: effectiveRoleForEmail(user.role, user.email) } as User) : null;
  }

  /**
   * Same as findById but exposes a display track from the latest assessment when users.track is unset (not persisted).
   */
  async findByIdForMe(id: number): Promise<User | null> {
    const user = await this.findById(id);
    if (!user || user.track) {
      return user;
    }
    const row = await this.assessmentRepo.findOne({
      where: { userId: id, isLatest: true },
      order: { completedAt: 'DESC' },
    });
    const t = normalizeAssessmentDomainToTrack(row?.domain);
    if (!t) return user;
    return { ...user, track: t } as User;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, email, fullName, phone, companyName, address, bio, role } = createUserDto as any;

    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Un utilisateur avec cet email existe déjà');
    }

    const assignedRole = role || 'student';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      email,
      passwordHash,
      fullName: fullName || email.split('@')[0],
      phone: phone || '',
      companyName: companyName || '',
      address: address || '',
      bio: bio || '',
      role: assignedRole,
      isEmailVerified: false,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedUser = await this.userRepository.save(user);
    const result = Array.isArray(savedUser) ? savedUser[0] : savedUser;

    // Auto-start 24h free trial for learner/student accounts created by admin
    if (TRIAL_ROLES.has(assignedRole)) {
      try {
        await this.subscriptionsService.startTrial(result.id, 'standard');
        this.logger.log(`[Users] Auto-started 24h free trial for new ${assignedRole} userId=${result.id}`);
      } catch (err) {
        // Non-fatal: log but don't fail user creation
        this.logger.warn(`[Users] Could not auto-start trial for userId=${result.id}: ${(err as any)?.message}`);
      }
    }

    return result;
  }

  async setPassword(id: number, password: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.userRepository.update(id, {
      passwordHash,
      updatedAt: new Date(),
    } as any);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const currentUser = await this.findById(id);
    if (!currentUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updateData = { ...updateUserDto } as any;
    if (updateData.password) {
      updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
      delete updateData.password;
    }

    await this.userRepository.update(id, { ...updateData, updatedAt: new Date() });

    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found after update`);
    }
    return updatedUser;
  }

  async findAll(options?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) {
    const { page = 1, limit = 20, role, status, search } = options || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (role && role !== 'all') {
      queryBuilder.andWhere('LOWER(TRIM(user.role)) = :role', { role: role.toLowerCase() });
    }

    if (status && status !== 'all') {
      queryBuilder.andWhere('LOWER(TRIM(user.status)) = :status', { status: status.toLowerCase() });
    }

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(user.fullName) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${search.toLowerCase()}%` }
      );
    }

    const [users, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const usersWithProgress = await Promise.all(
      users.map(async (user) => {
        const roadmap = await this.roadmapRepo.findOne({ where: { userId: user.id } });
        const latestQuiz = await this.quizRepo.findOne({
          where: { userId: user.id },
          order: { completedAt: 'DESC' },
        });

        const allModules = roadmap?.modules ?? [];
        const visibleModules = allModules.filter((m: any) => m.status !== 'locked');

        return {
          ...user,
          coursesTaken: visibleModules.length,
          averageProgress: roadmap?.totalProgress ?? 0,
          lastActivity: user.lastLogin || roadmap?.updatedAt,
          averageScore: latestQuiz?.score?.percentage ?? 0,
        };
      })
    );

    const instFlags = await this.subscriptionsService.mapUserIdsToInstitutionalSeat(
      usersWithProgress.map((u) => u.id),
    );
    const data = usersWithProgress.map((u) => ({
      ...u,
      institutionalLearnerAccess: !!instFlags[u.id],
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  findOne(id: number) {
    return this.findById(id);
  }

  async remove(id: number) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Remove direct dependencies that have NO ACTION FKs to users.
      await queryRunner.manager.query('DELETE FROM assessment_results WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM user_roadmaps WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM quiz_level_results WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM user_course_progress WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM lab_progress WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM goals WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM daily_goals WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM weekly_goals WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM exam_attempts WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM user_exam_streaks WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM user_subscriptions WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM university_program_enrollments WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM agent_usage_monthly WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM user_agent_state WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM job_search_chat_messages WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM notifications WHERE recipient_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM issued_certificates WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM employer_candidates WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM employer_employees WHERE user_id = $1', [id]);
      await queryRunner.manager.query('DELETE FROM employer_certified_learners WHERE user_id = $1', [id]);

      // Nullify optional ownership/reviewer references.
      await queryRunner.manager.query('UPDATE jobs SET employer_id = NULL WHERE employer_id = $1', [id]);
      await queryRunner.manager.query('UPDATE jobs SET reviewed_by = NULL WHERE reviewed_by = $1', [id]);
      await queryRunner.manager.query('UPDATE companies SET owner_id = NULL WHERE owner_id = $1', [id]);
      await queryRunner.manager.query(
        'UPDATE universities SET primary_contact_user_id = NULL WHERE primary_contact_user_id = $1',
        [id],
      );

      await queryRunner.manager.delete(User, { id });

      await queryRunner.commitTransaction();

      return { deleted: true, userId: id, message: 'User and all related data deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const dbError = error as { code?: string; detail?: string; message?: string };
      if (dbError?.code === '23503') {
        throw new BadRequestException(
          dbError.detail || 'Cannot delete this user because related records still exist.',
        );
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findByRole(role: string): Promise<User[]> {
    return this.userRepository.find({ where: { role } });
  }

  async updateUserRole(id: number, role: string): Promise<User> {
    return this.update(id, { role } as UpdateUserDto);
  }

  async getLearnersProgression(): Promise<any[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    const learners = users.filter(u => u.role !== 'admin');

    const results = await Promise.all(
      learners.map(async (user) => {
        const roadmap = await this.roadmapRepo.findOne({ where: { userId: user.id } });

        const latestQuiz = await this.quizRepo.findOne({
          where: { userId: user.id },
          order: { completedAt: 'DESC' },
        });

        const allModules = roadmap?.modules ?? [];
        const visibleModules = allModules.filter((m: any) => m.status !== 'locked');

        const courses = visibleModules.map((m: any) => ({
          name: m.title,
          progress: m.progress ?? (m.status === 'completed' ? 100 : 0),
          score: latestQuiz?.score?.percentage ?? 0,
          status:
            m.status === 'completed'
              ? 'completed'
              : m.status === 'current'
              ? 'in-progress'
              : 'not-started',
          lastAccess:
            roadmap?.updatedAt
              ? roadmap.updatedAt.toISOString().split('T')[0]
              : 'N/A',
        }));

        const displayName = user.fullName || user.email.split('@')[0];
        const avatar = displayName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        const lastActivityDate = user.lastLogin ?? roadmap?.updatedAt;
        const lastActivity = lastActivityDate
          ? this.formatRelativeTime(lastActivityDate)
          : 'Never';

        return {
          id: user.id,
          name: displayName,
          email: user.email,
          avatar,
          globalProgress: roadmap?.totalProgress ?? 0,
          averageScore: latestQuiz?.score?.percentage ?? 0,
          enrolledCourses: visibleModules.length,
          lastActivity,
          courses,
        };
      }),
    );

    return results;
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins}min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} weeks ago`;
  }

  /** Same as verification tokens: store SHA-256 hex of raw token only. */
  hashPasswordResetToken(rawToken: string): string {
    return this.hashEmailVerificationToken(rawToken);
  }

  async updateResetToken(email: string, rawToken: string, expires: Date): Promise<void> {
    const passwordResetToken = this.hashPasswordResetToken(rawToken);
    await this.userRepository.update({ email }, {
      passwordResetToken,
      passwordResetTokenExpires: expires,
      updatedAt: new Date(),
    } as any);
  }

  async findByResetToken(rawToken: string): Promise<User | null> {
    const passwordResetToken = this.hashPasswordResetToken(rawToken);
    return this.userRepository.findOne({ where: { passwordResetToken } });
  }

  async updatePassword(email: string, passwordHash: string): Promise<void> {
    await this.userRepository.update({ email }, {
      passwordHash,
      updatedAt: new Date(),
    } as any);
  }

  async clearResetToken(email: string): Promise<void> {
    await this.userRepository.update({ email }, {
      passwordResetToken: null,
      passwordResetTokenExpires: null,
      updatedAt: new Date(),
    } as any);
  }

  /** Store SHA-256 hex of the raw token sent by email (never store raw token). */
  hashEmailVerificationToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }

  async updateVerificationToken(email: string, rawToken: string, expires: Date): Promise<void> {
    const emailVerificationToken = this.hashEmailVerificationToken(rawToken);
    await this.userRepository.update({ email }, {
      emailVerificationToken,
      emailVerificationTokenExpires: expires,
      updatedAt: new Date(),
    } as any);
  }

  async findByVerificationToken(rawToken: string): Promise<User | null> {
    const emailVerificationToken = this.hashEmailVerificationToken(rawToken);
    return this.userRepository.findOne({ where: { emailVerificationToken } });
  }

  async setEmailVerifiedById(id: number, verified: boolean): Promise<void> {
    const now = new Date();
    await this.userRepository.update(id, {
      isEmailVerified: verified,
      emailVerifiedAt: verified ? now : null,
      updatedAt: now,
    } as any);
  }

  async verifyEmail(email: string): Promise<void> {
    const now = new Date();
    await this.userRepository.update({ email }, {
      isEmailVerified: true,
      emailVerifiedAt: now,
      updatedAt: now,
    } as any);
  }

  async clearVerificationToken(email: string): Promise<void> {
    await this.userRepository.update({ email }, {
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
      updatedAt: new Date(),
    } as any);
  }

  /**
   * Update a user's email address. Only allowed if the user is not yet email-verified.
   * This prevents changing email after account activation (which would require full re-verification flow).
   * Returns the updated user or throws if constraints are violated.
   */
  async updateEmail(currentEmail: string, newEmail: string): Promise<User | null> {
    const user = await this.findByEmail(currentEmail);
    if (!user) {
      return null;
    }

    // Only allow email changes for unverified users
    if (user.isEmailVerified) {
      throw new BadRequestException('Cannot change email on a verified account. Please contact support.');
    }

    // Check if new email is already taken
    const existing = await this.findByEmail(newEmail);
    if (existing) {
      throw new BadRequestException('This email address is already registered');
    }

    // Update email and clear verification token (will need re-send)
    await this.userRepository.update({ email: currentEmail }, {
      email: newEmail,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
      updatedAt: new Date(),
    } as any);

    return this.findByEmail(newEmail);
  }
}
