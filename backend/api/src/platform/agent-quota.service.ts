import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AgentUsageMonthly } from './entities/agent-usage-monthly.entity';
import { User } from '../users/entities/user.entity';
import { USER_ROLES } from '../common/constants';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export type AgentLimitsConfig = {
  default: number;
  perAgent: Record<string, number>;
};

const DEFAULT_LIMIT = 100;

@Injectable()
export class AgentQuotaService {
  constructor(
    @InjectRepository(AgentUsageMonthly)
    private readonly usageRepo: Repository<AgentUsageMonthly>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  currentYearMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }

  async getLimitsFromDb(): Promise<AgentLimitsConfig> {
    const row = await this.dataSource.query(
      `SELECT value FROM platform_settings WHERE key = 'agent_limits' LIMIT 1`,
    );
    if (!row?.length) {
      return { default: DEFAULT_LIMIT, perAgent: {} };
    }
    try {
      const j = JSON.parse(row[0].value) as AgentLimitsConfig;
      return {
        default: typeof j.default === 'number' ? j.default : DEFAULT_LIMIT,
        perAgent: j.perAgent && typeof j.perAgent === 'object' ? j.perAgent : {},
      };
    } catch {
      return { default: DEFAULT_LIMIT, perAgent: {} };
    }
  }

  async setLimits(config: AgentLimitsConfig): Promise<void> {
    const v = JSON.stringify({
      default: config.default,
      perAgent: config.perAgent || {},
    });
    await this.dataSource.query(
      `INSERT INTO platform_settings (key, value) VALUES ('agent_limits', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [v],
    );
  }

  /** Effective limit for one agent key */
  async resolveLimitForUser(userId: number, agentKey: string): Promise<number> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.agentLimitOverride != null && user.agentLimitOverride >= 0) {
      return user.agentLimitOverride;
    }
    const plan = await this.subscriptionsService.getActivePlanForUser(userId);
    if (plan?.features) {
      try {
        const f = JSON.parse(plan.features) as {
          agent_monthly_limit?: number;
          perAgent?: Record<string, number>;
        };
        if (f.perAgent && typeof f.perAgent[agentKey] === 'number' && f.perAgent[agentKey] >= 0) {
          return f.perAgent[agentKey];
        }
        if (typeof f.agent_monthly_limit === 'number' && f.agent_monthly_limit >= 0) {
          return f.agent_monthly_limit;
        }
      } catch {
        /* ignore */
      }
    }
    const cfg = await this.getLimitsFromDb();
    const per = cfg.perAgent[agentKey];
    if (typeof per === 'number' && per >= 0) return per;
    return cfg.default;
  }

  shouldEnforceQuota(role?: string | null): boolean {
    const r = (role || '').toLowerCase();
    return r === USER_ROLES.LEARNER || r === USER_ROLES.STUDENT || r === USER_ROLES.INSTRUCTOR || !r;
  }

  /**
   * Increments usage and throws 429 if over limit. Skips for admin/employer/university.
   */
  async assertAndConsume(userId: number, agentKey: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!this.shouldEnforceQuota(user?.role)) {
      return;
    }
    const limit = await this.resolveLimitForUser(userId, agentKey);
    if (limit <= 0) {
      throw new HttpException(
        { message: 'Agent quota exceeded for this month', agentKey, limit: 0 },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const yearMonth = this.currentYearMonth();

    await this.dataSource.transaction(async (qr) => {
      await qr.query(
        `INSERT INTO agent_usage_monthly (id, user_id, agent_key, year_month, count)
         VALUES (gen_random_uuid(), $1, $2, $3, 0)
         ON CONFLICT (user_id, agent_key, year_month) DO NOTHING`,
        [userId, agentKey, yearMonth],
      );
      const res = await qr.query(
        `UPDATE agent_usage_monthly SET count = count + 1
         WHERE user_id = $1 AND agent_key = $2 AND year_month = $3 AND count < $4
         RETURNING count`,
        [userId, agentKey, yearMonth, limit],
      );
      if (!res?.length) {
        const cur = await qr.query(
          `SELECT count FROM agent_usage_monthly WHERE user_id = $1 AND agent_key = $2 AND year_month = $3`,
          [userId, agentKey, yearMonth],
        );
        const used = parseInt(String(cur[0]?.count ?? 0), 10);
        throw new HttpException(
          {
            message: 'Monthly agent call limit reached',
            agentKey,
            limit,
            used,
            yearMonth,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    });
  }

  async getUsage(userId?: number, yearMonth?: string, agentKey?: string): Promise<AgentUsageMonthly[]> {
    const ym = yearMonth || this.currentYearMonth();
    const qb = this.usageRepo.createQueryBuilder('u').where('u.year_month = :ym', { ym });
    if (userId != null) qb.andWhere('u.user_id = :userId', { userId });
    if (agentKey) qb.andWhere('u.agent_key = :agentKey', { agentKey });
    return qb.orderBy('u.count', 'DESC').getMany();
  }

  async resetUsage(userId: number, agentKey: string, yearMonth: string): Promise<void> {
    await this.usageRepo.delete({ userId, agentKey, yearMonth });
  }
}
